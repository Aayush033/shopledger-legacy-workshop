var test = require('node:test');
var assert = require('node:assert/strict');

var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

test('invoice figures match the order billed with an HSN GST slab', function () {
  var items = [
    { id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 2 }
  ];
  var billed = pricing.computeTotals(items, '');
  var order = {
    id: 1001,
    date: '2026-11-21',
    items: items,
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  };

  var figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { subtotal: billed.subtotal, tax: billed.tax, total: billed.total },
    { subtotal: 200, tax: 10, total: 210 }
  );
  assert.deepEqual(
    { subtotal: figures.subtotal, tax: figures.tax, cgst: figures.cgst, sgst: figures.sgst, total: figures.total },
    { subtotal: billed.subtotal, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total }
  );
  assert.equal(figures.rows[0].gstPercent, billed.lines[0].gstPercent);
  assert.equal(figures.rows[0].lineTax, billed.lines[0].tax);
});

test('invoice figures match billed discount and GST totals and disclose the reconciliation delta', function () {
  var items = [
    { id: 1, name: 'Rice', hsn: '1006', price: 500, qty: 1 },
    { id: 2, name: 'Coffee', hsn: '0901', price: 500, qty: 1 }
  ];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var order = {
    id: 1002,
    date: '2026-11-21',
    customer: 'Test Customer',
    coupon: 'SAVE10',
    items: items,
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  };

  var figures = invoice.computeInvoiceFigures(order);
  var html = invoice.render(order);

  assert.deepEqual(
    { discount: billed.discount, tax: billed.tax, total: billed.total },
    { discount: 100, tax: 103.5, total: 1003.5 }
  );
  assert.deepEqual(
    { discount: figures.discount, tax: figures.tax, cgst: figures.cgst, sgst: figures.sgst, total: figures.total },
    { discount: billed.discount, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total }
  );
  assert.match(html, /CGST \+ SGST \(Total GST\)/);
  assert.doesNotMatch(html, /CGST<\/td>|SGST<\/td>/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
