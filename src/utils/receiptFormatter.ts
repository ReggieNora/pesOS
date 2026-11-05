import { TransactionRecord } from '../types/pos';

export interface CompletedSaleSummary {
  transaction: TransactionRecord;
  shiftTag: string;
  storeName?: string;
  customerPhone?: string;
  customerNewBalance?: number;
  customerCreditLimit?: number;
}

export function formatPlaintextReceipt(order: CompletedSaleSummary): string {
  const { transaction, storeName, customerNewBalance, customerCreditLimit } = order;
  const lines: string[] = [
    storeName ? `${storeName} • pesOS` : 'pesOS Sari-Sari Store',
    `Order #${transaction.id}`,
    `${transaction.createdAt}`,
    '------------------------',
  ];

  for (const item of transaction.items) {
    const lineSubtotal = (item.unitPrice * item.qty).toFixed(2);
    lines.push(`${item.qty}x ${item.name}: P${lineSubtotal}`);
  }

  lines.push('------------------------');
  lines.push(`Total Due: P${transaction.totalAmount.toFixed(2)}`);

  if (transaction.type === 'CASH') {
    const tendered = (transaction.cashTendered ?? transaction.totalAmount).toFixed(2);
    const change = (transaction.changeGiven ?? 0).toFixed(2);
    lines.push(`Amount Tendered: P${tendered}`);
    lines.push(`Change Due: P${change}`);
  } else {
    lines.push(`Charged to Pautang (${transaction.customerName || 'Customer'})`);
    if (customerNewBalance !== undefined && customerCreditLimit !== undefined) {
      lines.push(
        `New Balance: P${customerNewBalance.toFixed(2)} / P${customerCreditLimit.toFixed(2)}`
      );
    }
  }

  lines.push('------------------------');
  lines.push('Salamat sa pagbili!');

  return lines.join('\n');
}

export function buildSmsUri(phone: string, receiptText: string): string {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const encodedBody = encodeURIComponent(receiptText);
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `sms:${cleanPhone}${separator}body=${encodedBody}`;
}
