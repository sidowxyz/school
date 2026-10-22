import api from '../lib/axios';

export interface StudentInvoiceApi {
  _id: string;
  invoice_no?: string;
  invoiceNumber?: string;
  student?: {
    firstName?: string;
    lastName?: string;
    admission_no?: string;
  };
  fee_struc_no?: {
    fee_type_no?: {
      fee_name?: string;
    };
  };
  invoice_amount?: number;
  totalAmount?: number;
  paid_amount?: number;
  balance?: number;
  status?: string;
  dueDate?: string;
  registerDate?: string;
  createdAt?: string;
}

export interface StudentFeeApi {
  _id: string;
  student_fee_no?: string;
  invoice_no?: StudentInvoiceApi;
  payment_method_no?: {
    payment_method_name?: string;
  };
  paid_amount?: number;
  acc_no?: string;
  registerBy?: string;
  registerDate?: string;
  createdAt?: string;
}

export interface PaymentMethodApi {
  _id: string;
  payment_method_name: string;
}

export const getStudentInvoices = async () => {
  const response = await api.get('/student-invoices');
  return response.data.data as StudentInvoiceApi[];
};

export const getStudentFees = async () => {
  const response = await api.get('/student-fees');
  return response.data.data as StudentFeeApi[];
};

export const getPaymentMethods = async () => {
  const response = await api.get('/payment-methods');
  return response.data.data as PaymentMethodApi[];
};

export const createStudentFee = async (payload: {
  student_fee_no: string;
  invoice_no: string;
  payment_method_no: string;
  paid_amount: number;
  acc_no?: string;
}) => {
  const response = await api.post('/student-fees', payload);
  return response.data;
};
