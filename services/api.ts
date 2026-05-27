// Fix: Import the TransactionHistory type from ../types
import { Customer, Transaction, ConnectionType, NewCustomer, NewTransaction, UpdateTransactionPayload, Delivery, TransactionHistory, CustomerDocument, DocumentType } from '../types';

// IMPORTANT: Paste your Firebase project configuration here.
// The application will not work until you replace these placeholder values.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCx_3WVHWXOyJuKVUq86_2hWTpeQ6FBCi0",
  authDomain: "lpg-crm-70b87.firebaseapp.com",
  projectId: "lpg-crm-70b87",
  storageBucket: "lpg-crm-70b87.firebasestorage.app",
  messagingSenderId: "705055833971",
  appId: "1:705055833971:web:c7bfbb2024cf8211200f06",
  measurementId: "G-0BC5ENNKY4"
};

// Initialize Firebase
// This will throw an error if the config is not replaced, which is expected.
(window as any).firebase.initializeApp(firebaseConfig);
const db = (window as any).firebase.firestore();
const storage = (window as any).firebase.storage();

const customersCollection = db.collection('customers');
const transactionsCollection = db.collection('transactions');
const deliveriesCollection = db.collection('deliveries');
const configCollection = db.collection('config');
const documentsCollection = db.collection('documents');

// Type-safe mappers to convert Firestore docs to our types with default values
const customerFromDoc = (doc: any): Customer => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        name: data.name || '',
        customerId: data.customerId || '',
        consumerNo: data.consumerNo || '',
        lpgId: data.lpgId || '',
        relationType: data.relationType || 'S/O',
        relationName: data.relationName || data.sonOf || '',
        mobileNo: data.mobileNo || '',
        panchayat: data.panchayat || '',
        otherPanchayat: data.otherPanchayat || '',
        village: data.village || '',
        otherVillage: data.otherVillage || '',
        svNo: data.svNo || '',
        aadhaarNo: data.aadhaarNo || '',
        connectionType: data.connectionType || ConnectionType.BPL,
        balance: data.balance || 0,
        dueDate: data.dueDate,
        isDeleted: data.isDeleted || false,
        agencyName: data.agencyName || '',
        kyc: data.kyc || false,
        lastBookingDate: data.lastBookingDate || null,
        remark: data.remark || '',
    };
};

const transactionFromDoc = (doc: any): Transaction => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        customerId: data.customerId || '',
        walkInName: data.walkInName || '',
        walkInMobile: data.walkInMobile || '',
        date: data.date || new Date().toISOString(),
        price: data.price || 0,
        amountPaid: data.amountPaid || 0,
        description: data.description || '',
        gasCompanyGiven: data.gasCompanyGiven || '',
        gasCompanyReceived: data.gasCompanyReceived || '',
        history: data.history || [],
        source: data.source || 'manual',
    };
};

const deliveryFromDoc = (doc: any): Delivery => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        customerRelationType: data.customerRelationType || 'S/O',
        customerRelationName: data.customerRelationName || data.customerSonOf || '',
        customerMobileNo: data.customerMobileNo || '',
        customerAddress: data.customerAddress || '',
        requestedAt: data.requestedAt || new Date().toISOString(),
        completedAt: data.completedAt || null,
    };
};

const documentFromDoc = (doc: any): CustomerDocument => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        customerId: data.customerId || '',
        documentType: data.documentType,
        url: data.url || '',
        fileName: data.fileName || '',
        filePath: data.filePath || '',
        uploadedAt: data.uploadedAt || new Date().toISOString(),
    };
};


export const checkAdminPassword = async (password: string): Promise<boolean> => {
    try {
        const doc = await configCollection.doc('admin').get();
        if (doc.exists && doc.data().password === password) {
            return true;
        }
        // Fallback for first-time setup
        if (password === 'admin123') {
             await configCollection.doc('admin').set({ password: 'admin123' });
             return true;
        }
        return false;
    } catch (error) {
        console.error("Error checking admin password:", error);
        return password === 'admin123'; // fallback on error
    }
}

export const getCustomers = async (): Promise<Customer[]> => {
  const snapshot = await customersCollection.where('isDeleted', '==', false).get();
  return snapshot.docs.map(customerFromDoc);
};

export const getAllCustomers = async (): Promise<Customer[]> => {
    const snapshot = await customersCollection.get();
    return snapshot.docs.map(customerFromDoc);
}

export const getCustomerById = async (id: string): Promise<Customer | undefined> => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    console.warn('getCustomerById called with invalid ID');
    return undefined;
  }
  try {
    const docId = id.trim();
    const docRef = customersCollection.doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.warn(`Customer document with ID ${docId} does not exist.`);
      return undefined;
    }
    
    // Explicitly check the isDeleted flag from the raw data.
    const data = doc.data();
    if (data && data.isDeleted === true) {
        console.warn(`Attempted to access a deleted customer: ${docId}`);
        return undefined;
    }
    
    // If we're here, the customer exists and is not deleted.
    return customerFromDoc(doc);

  } catch (error) {
      console.error(`Error fetching customer by ID ${id}:`, error);
      return undefined;
  }
};

// Helper to remove undefined values recursively
const sanitize = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // Don't sanitize Firestore FieldValue or Date objects
    if (obj instanceof Date || (obj.constructor && obj.constructor.name.includes('FieldValue')) || typeof obj.isEqual === 'function') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitize);
    }
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            newObj[key] = sanitize(obj[key]);
        }
    });
    return newObj;
};

export const addCustomer = async (customerData: NewCustomer): Promise<Customer> => {
    // Check for uniqueness on consumerNo, but only if it's not empty
    if (customerData.consumerNo && customerData.consumerNo.trim() !== '') {
        const existingCustomerQuery = await customersCollection.where('consumerNo', '==', customerData.consumerNo).limit(1).get();
        if (!existingCustomerQuery.empty) {
            throw new Error(`A customer with Consumer No '${customerData.consumerNo}' already exists.`);
        }
    }
  const cleanData = sanitize(customerData);
  const docRef = await customersCollection.add({ ...cleanData, isDeleted: false });
  return { id: docRef.id, ...cleanData, isDeleted: false } as Customer;
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    const cleanData = sanitize(data);
    await customersCollection.doc(id).update(cleanData);
};

export const getDocumentsByCustomerId = async (customerId: string): Promise<CustomerDocument[]> => {
    const snapshot = await documentsCollection.where('customerId', '==', customerId).get();
    return snapshot.docs.map(documentFromDoc);
};

export const uploadCustomerDocument = async (customerId: string, documentType: DocumentType, file: File, onProgress: (progress: number) => void): Promise<void> => {
    try {
        const querySnapshot = await documentsCollection
            .where('customerId', '==', customerId)
            .where('documentType', '==', documentType)
            .limit(1)
            .get();
        
        const existingDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[0] : null;

        if (existingDoc) {
            const oldData = documentFromDoc(existingDoc);
            if (oldData.filePath) {
                try {
                    const oldFileRef = storage.ref(oldData.filePath);
                    await oldFileRef.delete();
                } catch (error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.warn("Could not delete old file from storage, it may have already been removed:", error);
                    }
                }
            }
        }

        const filePath = `customer-documents/${customerId}/${documentType}-${Date.now()}-${file.name}`;
        const fileRef = storage.ref(filePath);
        const uploadTask = fileRef.put(file);

        uploadTask.on('state_changed', (snapshot: any) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
        });

        await uploadTask;

        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

        const documentData = {
            customerId,
            documentType,
            url: downloadURL,
            fileName: file.name,
            filePath: filePath,
            uploadedAt: new Date().toISOString(),
        };
        
        if (existingDoc) {
            await documentsCollection.doc(existingDoc.id).update(documentData);
        } else {
            await documentsCollection.add(documentData);
        }
    } catch (error: any) {
        console.error("Full upload error object:", error);
        let message = "Upload failed due to an unknown error.";
        if (error.code) {
            switch (error.code) {
                case 'storage/unauthorized':
                    message = "Upload failed: Permission denied. This is likely a Firebase Storage security rule issue. Please allow writes to your storage bucket.";
                    break;
                case 'storage/object-not-found':
                    message = "Upload failed: An old file could not be found to be replaced.";
                    break;
                case 'storage/canceled':
                    message = "Upload was canceled.";
                    break;
                default:
                    message = `Upload failed with error code: ${error.code}`;
            }
        }
        throw new Error(message);
    }
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
    const customerRef = customersCollection.doc(customerId);
    const customerDoc = await customerRef.get();
    if (!customerDoc.exists) throw new Error("Customer not found");
    const isCurrentlyDeleted = customerDoc.data().isDeleted || false;
    await customerRef.update({ isDeleted: !isCurrentlyDeleted });
}

export const permanentlyDeleteCustomer = async (customerId: string): Promise<void> => {
    const customerRef = customersCollection.doc(customerId);
    
    // 1. Find all related documents and files
    const documentsSnapshot = await documentsCollection.where('customerId', '==', customerId).get();
    const transactionsSnapshot = await transactionsCollection.where('customerId', '==', customerId).get();
    const deliveriesSnapshot = await deliveriesCollection.where('customerId', '==', customerId).get();

    const filePaths: string[] = [];
    documentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.filePath) {
            filePaths.push(data.filePath);
        }
    });

    // 2. Delete all Firestore documents in a batch
    const batch = db.batch();
    
    documentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    transactionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    deliveriesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(customerRef);

    await batch.commit();

    // 3. Delete all files from Storage
    const deletePromises = filePaths.map(path => {
        const fileRef = storage.ref(path);
        return fileRef.delete().catch(error => {
            if (error.code !== 'storage/object-not-found') {
                console.error(`Failed to delete file at ${path}:`, error);
            }
        });
    });

    await Promise.all(deletePromises);
};


export const upsertCustomersBulk = async (customerData: (NewCustomer & { existingId?: string })[]): Promise<{ created: number; updated: number }> => {
    let created = 0;
    let updated = 0;
    const BATCH_SIZE = 450; // Firestore limit is 500, keeping a buffer
    
    // Helper to remove undefined values
    const sanitize = (obj: any) => {
        const newObj: any = {};
        Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
                newObj[key] = obj[key];
            }
        });
        return newObj;
    };

    // Process in chunks
    for (let i = 0; i < customerData.length; i += BATCH_SIZE) {
        const chunk = customerData.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        let operationsInBatch = 0;

        for (const newcomer of chunk) {
            let existingId = newcomer.existingId;
            
            // Fallback for cases where existingId isn't provided but consumerNo is present
            if (!existingId && newcomer.consumerNo && newcomer.consumerNo.trim() !== '') {
                const query = await customersCollection.where('consumerNo', '==', newcomer.consumerNo).limit(1).get();
                if (!query.empty) {
                    existingId = query.docs[0].id;
                }
            }

            const { existingId: _, ...dataToSave } = newcomer;
            const cleanData = sanitize(dataToSave);

            if (existingId) {
                const existingRef = customersCollection.doc(existingId);
                batch.update(existingRef, cleanData);
                updated++;
            } else {
                const newDocRef = customersCollection.doc();
                batch.set(newDocRef, { ...cleanData, balance: dataToSave.balance || 0, isDeleted: false });
                created++;
            }
            operationsInBatch++;
        }

        if (operationsInBatch > 0) {
            await batch.commit();
        }
    }
    
    return { created, updated };
};

export const getTransactions = async (): Promise<Transaction[]> => {
    const snapshot = await transactionsCollection.orderBy('date', 'desc').get();
    return snapshot.docs.map(transactionFromDoc);
};

export const getTransactionsByCustomerId = async (customerId: string): Promise<Transaction[]> => {
    const snapshot = await transactionsCollection.where('customerId', '==', customerId).get();
    const transactions = snapshot.docs.map(transactionFromDoc);
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addTransaction = async (customerId: string | undefined, transactionData: NewTransaction): Promise<Transaction> => {
    const newTransactionRef = transactionsCollection.doc();

    if (customerId) {
        const customerRef = customersCollection.doc(customerId);
        await db.runTransaction(async (t: any) => {
            const customerDoc = await t.get(customerRef);
            if (!customerDoc.exists) throw new Error("Customer not found");
            
            const currentBalance = customerDoc.data().balance || 0;
            const balanceChange = transactionData.amountPaid - transactionData.price;
            const newBalance = currentBalance + balanceChange;

            t.update(customerRef, { balance: newBalance });
            t.set(newTransactionRef, sanitize({
                ...transactionData,
                customerId,
                date: new Date().toISOString(),
                source: transactionData.source || 'manual',
            }));
        });

        return { id: newTransactionRef.id, customerId, date: new Date().toISOString(), source: transactionData.source || 'manual', ...transactionData };
    } else {
        const data = sanitize({
            ...transactionData,
            date: new Date().toISOString(),
            source: transactionData.source || 'quick-sell',
        });
        await newTransactionRef.set(data);
        return { id: newTransactionRef.id, ...data } as Transaction;
    }
};

export const updateTransaction = async (transactionId: string, updatedData: UpdateTransactionPayload): Promise<Transaction> => {
    const transactionRef = transactionsCollection.doc(transactionId);
    
    let updatedTransaction: Transaction | null = null;

    await db.runTransaction(async (t: any) => {
        const transactionDoc = await t.get(transactionRef);
        if (!transactionDoc.exists) throw new Error("Transaction not found");

        const oldTransaction = transactionFromDoc(transactionDoc);
        const customerRef = customersCollection.doc(oldTransaction.customerId);
        const customerDoc = await t.get(customerRef);
        if (!customerDoc.exists) throw new Error("Customer not found");

        let balance = customerDoc.data().balance || 0;
        
        const oldBalanceChange = (oldTransaction.amountPaid || 0) - (oldTransaction.price || 0);
        balance -= oldBalanceChange;
        
        const newBalanceChange = (updatedData.amountPaid || 0) - (updatedData.price || 0);
        balance += newBalanceChange;

        const historyEntry: TransactionHistory = sanitize({
            changedAt: new Date().toISOString(),
            previousState: { 
                price: oldTransaction.price,
                amountPaid: oldTransaction.amountPaid,
                description: oldTransaction.description, 
                date: oldTransaction.date, 
                gasCompanyGiven: oldTransaction.gasCompanyGiven, 
                gasCompanyReceived: oldTransaction.gasCompanyReceived,
                source: oldTransaction.source,
            }
        });

        updatedTransaction = { ...oldTransaction, ...updatedData, history: [...(oldTransaction.history || []), historyEntry] };
        
        t.update(customerRef, { balance });
        t.update(transactionRef, sanitize({ ...updatedData, history: (window as any).firebase.firestore.FieldValue.arrayUnion(historyEntry) }));
    });
    
    if (!updatedTransaction) throw new Error("Failed to update transaction");
    return updatedTransaction;
}

export const getDeliveries = async (): Promise<Delivery[]> => {
    const snapshot = await deliveriesCollection.orderBy('requestedAt', 'desc').get();
    return snapshot.docs.map(deliveryFromDoc);
}

export const addDelivery = async (customerId: string): Promise<Delivery> => {
    const customer = await getCustomerById(customerId);
    if (!customer) throw new Error("Customer not found");

    const newDeliveryData = {
        customerId,
        customerName: customer.name,
        customerRelationType: customer.relationType,
        customerRelationName: customer.relationName,
        customerMobileNo: customer.mobileNo,
        customerAddress: `${customer.village}, ${customer.panchayat}`,
        requestedAt: new Date().toISOString(),
        completedAt: null,
    };
    const docRef = await deliveriesCollection.add(newDeliveryData);
    return { id: docRef.id, ...newDeliveryData };
}

export const completeDelivery = async (deliveryId: string, transactionData: NewTransaction): Promise<void> => {
    const deliveryRef = deliveriesCollection.doc(deliveryId);

    await db.runTransaction(async (t: any) => {
        const deliveryDoc = await t.get(deliveryRef);
        if (!deliveryDoc.exists) throw new Error("Delivery not found");

        const customerId = deliveryDoc.data().customerId;
        const customerRef = customersCollection.doc(customerId);
        const customerDoc = await t.get(customerRef);
        if (!customerDoc.exists) throw new Error("Customer not found for this delivery");

        const newTransactionRef = transactionsCollection.doc();
        const newTransactionData: Omit<Transaction, 'id'> = {
            ...transactionData,
            description: `Delivery: ${transactionData.description}`,
            source: 'delivery',
            customerId,
            date: new Date().toISOString(),
        };
        
        const currentBalance = customerDoc.data().balance || 0;
        const balanceChange = newTransactionData.amountPaid - newTransactionData.price;
        const newBalance = currentBalance + balanceChange;
        
        t.update(customerRef, { balance: newBalance });
        t.set(newTransactionRef, newTransactionData);

        t.update(deliveryRef, { completedAt: new Date().toISOString() });
    });
};

export const getDashboardStats = async (dateRange?: {start: Date, end: Date}) => {
    const activeCustomersSnapshot = await customersCollection.where('isDeleted', '==', false).get();
    const allCustomers = activeCustomersSnapshot.docs.map(customerFromDoc);
    
    let transactionsQuery = transactionsCollection;
    if (dateRange) {
        transactionsQuery = transactionsQuery
            .where('date', '>=', dateRange.start.toISOString())
            .where('date', '<=', dateRange.end.toISOString());
    }
    const transactionsSnapshot = await transactionsQuery.get();
    const allTransactions = transactionsSnapshot.docs.map(transactionFromDoc);

    const pendingDeliveriesSnapshot = await deliveriesCollection.where('completedAt', '==', null).get();

    let completedDeliveriesInPeriod = 0;
    if (dateRange) {
        const completedDeliveriesSnapshot = await deliveriesCollection
            .where('completedAt', '>=', dateRange.start.toISOString())
            .where('completedAt', '<=', dateRange.end.toISOString())
            .get();
        completedDeliveriesInPeriod = completedDeliveriesSnapshot.size;
    } else {
        const allCompletedDeliveriesSnapshot = await deliveriesCollection.where('completedAt', '>', ' ').get();
        completedDeliveriesInPeriod = allCompletedDeliveriesSnapshot.size;
    }

    const totalCustomers = allCustomers.length;
    const totalTransactions = allTransactions.length;
    const totalOutstanding = allCustomers.reduce((sum, c) => sum + (c.balance < 0 ? -c.balance : 0), 0);
    const pendingDeliveries = pendingDeliveriesSnapshot.size;
    
    let pendingBookings = 0;
    allCustomers.forEach(customer => {
        if (!customer.lastBookingDate) {
            pendingBookings++;
        } else {
            const diffInDays = (new Date().getTime() - new Date(customer.lastBookingDate).getTime()) / (1000 * 3600 * 24);
            if (diffInDays >= 45) {
                pendingBookings++;
            }
        }
    });
    
    const recentTransactions = allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    const recentTransactionsWithCustomer = await Promise.all(recentTransactions.map(async t => {
        let customerName = 'Unknown';
        if (t.walkInName) {
            customerName = `${t.walkInName} (Walk-in)`;
        } else if (t.customerId) {
            const customerInList = allCustomers.find(c => c.id === t.customerId);
            if (customerInList) {
                customerName = customerInList.name;
            } else {
                const customer = await getCustomerById(t.customerId);
                if (customer) customerName = customer.name;
            }
        }
        return { ...t, customerName };
    }));

    return { totalCustomers, totalTransactions, totalOutstanding, recentTransactions: recentTransactionsWithCustomer, pendingDeliveries, completedDeliveriesInPeriod, pendingBookings };
}