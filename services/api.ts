// Fix: Import the TransactionHistory type from ../types
import { Customer, Transaction, ConnectionType, NewCustomer, NewTransaction, UpdateTransactionPayload, Delivery, TransactionHistory, CustomerDocument, DocumentType, AppUser, StockLocation, StockTransaction, CylinderType, PaymentMethod } from '../types';

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
(window as any).firebase.initializeApp(firebaseConfig);
const db = (window as any).firebase.firestore();
const storage = (window as any).firebase.storage();

const customersCollection = db.collection('customers');
const transactionsCollection = db.collection('transactions');
const deliveriesCollection = db.collection('deliveries');
const configCollection = db.collection('config');
const documentsCollection = db.collection('documents');
const appUsersCollection = db.collection('app_users');
const stockLocationsCollection = db.collection('stock_locations');
const stockTransactionsCollection = db.collection('stock_transactions');

export const isCustomerUnbooked = (lastBookingDate: string | null | undefined, agencyName?: string): boolean => {
    if (!lastBookingDate) return true;
    const cycleDays = agencyName === 'M/S VINDHYAWASHNI BHARAT GAS' || agencyName === 'BINDHYABASINI BHARAT GAS (BIHAR SHARIF)' ? 30 : 45;
    
    const lastDate = new Date(lastBookingDate);
    const eligibleDate = new Date(lastDate);
    eligibleDate.setDate(eligibleDate.getDate() + cycleDays);
    eligibleDate.setHours(1, 0, 0, 0);
    
    return new Date().getTime() >= eligibleDate.getTime();
};

export const getEligibleBookingDate = (lastBookingDate: string, agencyName?: string): Date => {
    const lastDate = new Date(lastBookingDate);
    const eligibleDate = new Date(lastDate);
    const cycleDays = agencyName === 'M/S VINDHYAWASHNI BHARAT GAS' || agencyName === 'BINDHYABASINI BHARAT GAS (BIHAR SHARIF)' ? 30 : 45;
    eligibleDate.setDate(eligibleDate.getDate() + cycleDays);
    eligibleDate.setHours(1, 0, 0, 0);
    return eligibleDate;
};

export const getBookingCycleDays = (agencyName?: string): number => {
    if (agencyName === 'M/S VINDHYAWASHNI BHARAT GAS' || agencyName === 'BINDHYABASINI BHARAT GAS (BIHAR SHARIF)') return 30;
    return 45;
};

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
        cardStatus: data.cardStatus || '',
    };
};

const transactionFromDoc = (doc: any): Transaction => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        customerId: data.customerId || '',
        walkInName: data.walkInName || '',
        walkInMobile: data.walkInMobile || '',
        walkInConsumerNo: data.walkInConsumerNo || '',
        date: data.date || new Date().toISOString(),
        price: data.price || 0,
        amountPaid: data.amountPaid || 0,
        paymentMethod: data.paymentMethod || 'cash',
        description: data.description || '',
        gasCompanyGiven: data.gasCompanyGiven || '',
        gasCompanyReceived: data.gasCompanyReceived || '',
        history: data.history || [],
        source: data.source || 'manual',
    };
};

const deliveryFromDoc = (doc: any): Delivery => {
    const data = doc.data() || {};
    const completedAt = data.completedAt || null;
    const assignedTo = data.assignedTo || null;
    let status = data.status;
    if (!status) {
        status = completedAt ? 'completed' : assignedTo ? 'out_for_delivery' : 'pending';
    }

    return {
        id: doc.id,
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        customerRelationType: data.customerRelationType || 'S/O',
        customerRelationName: data.customerRelationName || data.customerSonOf || '',
        customerMobileNo: data.customerMobileNo || '',
        customerAddress: data.customerAddress || '',
        requestedAt: data.requestedAt || new Date().toISOString(),
        completedAt,
        status,
        assignedTo,
        assignedVehicleId: data.assignedVehicleId || null,
        assignedAt: data.assignedAt || null,
        cylinderType: data.cylinderType || null,
        filledHandedOver: data.filledHandedOver || 0,
        emptiesReceived: data.emptiesReceived || 0,
        completedBy: data.completedBy || null,
        undeliveredReason: data.undeliveredReason || null,
        undeliveredAt: data.undeliveredAt || null,
        undeliveredBy: data.undeliveredBy || null,
    };
};

export const loginAdminUser = async (email: string, password: string): Promise<AppUser> => {
    const cleanEmail = email ? email.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    // If no email entered, test master admin password directly
    if (!cleanEmail || cleanEmail.toLowerCase() === 'admin') {
        const isMaster = await checkAdminPassword(cleanPassword);
        if (isMaster) {
            return {
                uid: 'master-admin',
                email: 'admin@lpg.local',
                name: 'Master Admin',
                role: 'admin',
                active: true,
            };
        }
    }

    const auth = (window as any).firebase?.auth();
    if (!auth) {
        const isMaster = await checkAdminPassword(cleanPassword);
        if (isMaster) {
            return {
                uid: 'master-admin',
                email: 'admin@lpg.local',
                name: 'Master Admin',
                role: 'admin',
                active: true,
            };
        }
        throw new Error("Firebase Auth is not initialized. Please check connection.");
    }

    try {
        // Sign in with Firebase Auth
        const cred = await auth.signInWithEmailAndPassword(cleanEmail, cleanPassword);
        const user = cred.user;
        if (!user) throw new Error("Authentication failed");

        // Fetch user profile from Firestore 'app_users' collection
        let userData: any = null;

        // 1. Try doc by UID
        try {
            const userDoc = await appUsersCollection.doc(user.uid).get();
            if (userDoc.exists) {
                userData = userDoc.data();
            }
        } catch (e) {
            console.warn("Error fetching user doc by UID:", e);
        }

        // 2. Try query by email if doc by UID was missing
        if (!userData && user.email) {
            try {
                const queryByEmail = await appUsersCollection.where('email', '==', user.email).limit(1).get();
                if (!queryByEmail.empty) {
                    userData = queryByEmail.docs[0].data();
                } else {
                    const queryByEmailLower = await appUsersCollection.where('email', '==', user.email.toLowerCase()).limit(1).get();
                    if (!queryByEmailLower.empty) {
                        userData = queryByEmailLower.docs[0].data();
                    }
                }
            } catch (e) {
                console.warn("Error querying app_users by email:", e);
            }
        }

        // 3. Check active state if record exists
        if (userData && userData.active === false) {
            await auth.signOut();
            throw new Error("This account has been deactivated.");
        }

        return {
            uid: user.uid,
            email: user.email || cleanEmail,
            name: userData?.name || userData?.displayName || user.displayName || user.email?.split('@')[0] || 'Admin User',
            mobileNo: userData?.mobileNo || userData?.phone || '',
            role: userData?.role || 'admin',
            active: true,
            createdAt: userData?.createdAt,
        };
    } catch (authErr: any) {
        // Fallback: check master password in case user is signing in with master admin PIN
        const isMaster = await checkAdminPassword(cleanPassword);
        if (isMaster) {
            return {
                uid: 'master-admin',
                email: cleanEmail || 'admin@lpg.local',
                name: 'Master Admin',
                role: 'admin',
                active: true,
            };
        }
        throw authErr;
    }
};

export const logoutAdminUser = async (): Promise<void> => {
    try {
        localStorage.removeItem('master_admin_session');
    } catch (e) {}
    const auth = (window as any).firebase?.auth();
    if (auth) {
        try {
            await auth.signOut();
        } catch (e) {}
    }
};

export const getCurrentAuthAppUser = async (): Promise<AppUser | null> => {
    // Check local master admin session fallback
    try {
        if (localStorage.getItem('master_admin_session') === 'true') {
            return {
                uid: 'master-admin',
                email: 'admin@lpg.local',
                name: 'Master Admin',
                role: 'admin',
                active: true,
            };
        }
    } catch (e) {}

    const auth = (window as any).firebase?.auth();
    if (!auth || !auth.currentUser) return null;

    try {
        const user = auth.currentUser;
        const uid = user.uid;
        let userData: any = null;

        const docByUid = await appUsersCollection.doc(uid).get();
        if (docByUid.exists) {
            userData = docByUid.data();
        } else if (user.email) {
            const q = await appUsersCollection.where('email', '==', user.email).limit(1).get();
            if (!q.empty) userData = q.docs[0].data();
        }

        if (!userData || userData.active !== false) {
            return {
                uid,
                email: user.email || '',
                name: userData?.name || user.displayName || user.email?.split('@')[0] || 'Admin',
                mobileNo: userData?.mobileNo || '',
                role: userData?.role || 'admin',
                active: true,
            };
        }
    } catch (e) {
        console.error("Error fetching current auth app user:", e);
    }
    return null;
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

export const completePendingDeliveriesForCustomer = async (customerId: string, completedAtDate?: string): Promise<void> => {
    try {
        const pendingSnapshot = await deliveriesCollection
            .where('customerId', '==', customerId)
            .where('completedAt', '==', null)
            .get();
            
        if (!pendingSnapshot.empty) {
            const batch = db.batch();
            const dateToSet = completedAtDate || new Date().toISOString();
            pendingSnapshot.docs.forEach((doc: any) => {
                batch.update(doc.ref, { completedAt: dateToSet });
            });
            await batch.commit();
        }
    } catch (e) {
        console.error("Failed to complete pending deliveries for customer", e);
    }
};

export const addTransaction = async (customerId: string | undefined, transactionData: NewTransaction & { date?: string }): Promise<Transaction> => {
    const newTransactionRef = transactionsCollection.doc();
    const transactionDate = transactionData.date || new Date().toISOString();

    let resolvedCustomerId = customerId;

    // Fallback: If customerId wasn't passed directly, check if walkInConsumerNo or walkInMobile matches a registered customer
    if (!resolvedCustomerId) {
        if (transactionData.walkInConsumerNo && transactionData.walkInConsumerNo.trim() !== '') {
            const matchQuery = await customersCollection.where('consumerNo', '==', transactionData.walkInConsumerNo.trim()).limit(1).get();
            if (!matchQuery.empty) {
                resolvedCustomerId = matchQuery.docs[0].id;
            }
        }
        if (!resolvedCustomerId && transactionData.walkInMobile && transactionData.walkInMobile.trim() !== '') {
            const matchQuery = await customersCollection.where('mobileNo', '==', transactionData.walkInMobile.trim()).limit(1).get();
            if (!matchQuery.empty) {
                resolvedCustomerId = matchQuery.docs[0].id;
            }
        }
    }

    if (resolvedCustomerId) {
        const customerRef = customersCollection.doc(resolvedCustomerId);
        await db.runTransaction(async (t: any) => {
            const customerDoc = await t.get(customerRef);
            if (!customerDoc.exists) throw new Error("Customer not found");
            
            const currentBalance = customerDoc.data().balance || 0;
            const balanceChange = transactionData.amountPaid - transactionData.price;
            const newBalance = currentBalance + balanceChange;

            t.update(customerRef, { balance: newBalance });
            t.set(newTransactionRef, sanitize({
                ...transactionData,
                customerId: resolvedCustomerId,
                date: transactionDate,
                source: transactionData.source || 'manual',
            }));
        });

        // Automatically clear/complete any pending delivery for this customer
        await completePendingDeliveriesForCustomer(resolvedCustomerId, transactionDate);

        return { id: newTransactionRef.id, customerId: resolvedCustomerId, date: transactionDate, source: transactionData.source || 'manual', ...transactionData };
    } else {
        const data = sanitize({
            ...transactionData,
            date: transactionDate,
            source: transactionData.source || 'quick-sell',
        });
        await newTransactionRef.set(data);

        // Also check if any pending delivery matches the walk-in mobile or walk-in name
        if (transactionData.walkInMobile && transactionData.walkInMobile.trim() !== '') {
            try {
                const pendingByMobile = await deliveriesCollection
                    .where('customerMobileNo', '==', transactionData.walkInMobile.trim())
                    .where('completedAt', '==', null)
                    .get();
                if (!pendingByMobile.empty) {
                    const batch = db.batch();
                    pendingByMobile.docs.forEach((doc: any) => {
                        batch.update(doc.ref, { completedAt: transactionDate });
                    });
                    await batch.commit();
                }
            } catch(e) {
                console.error("Error clearing pending delivery by mobile", e);
            }
        }

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
    let snapshot = await deliveriesCollection.orderBy('requestedAt', 'desc').get();
    
    // Cleanup old deliveries (> 45 days)
    const now = new Date().getTime();
    const fortyFiveDaysMs = 45 * 24 * 60 * 60 * 1000;
    
    await Promise.all(snapshot.docs.map(async (doc: any) => {
        const data = doc.data();
        if (!data.completedAt) {
            const requestedTime = new Date(data.requestedAt).getTime();
            if (now - requestedTime > fortyFiveDaysMs) {
                // Booked but not delivered
                const customerId = data.customerId;
                const customer = await getCustomerById(customerId);
                if (customer) {
                   await addTransaction(customerId, {
                       price: 0,
                       amountPaid: 0,
                       description: 'Booked but not delivered',
                       gasCompanyGiven: customer.agencyName || 'Other',
                       source: 'manual'
                   });
                }
                // Delete from deliveries
                await deleteDelivery(doc.id);
            }
        }
    }));
    
    // Refetch snapshot to return updated deliveries
    snapshot = await deliveriesCollection.orderBy('requestedAt', 'desc').get();
    
    return snapshot.docs.map(deliveryFromDoc);
}

export const deleteDelivery = async (deliveryId: string): Promise<void> => {
    await deliveriesCollection.doc(deliveryId).delete();
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
            description: `Delivery: ${transactionData.description || 'Refill'}`,
            source: 'delivery',
            customerId,
            date: new Date().toISOString(),
            paymentMethod: transactionData.paymentMethod || 'cash',
        };
        
        const currentBalance = customerDoc.data().balance || 0;
        const balanceChange = newTransactionData.amountPaid - newTransactionData.price;
        const newBalance = currentBalance + balanceChange;
        
        t.update(customerRef, { balance: newBalance });
        t.set(newTransactionRef, sanitize(newTransactionData));

        t.update(deliveryRef, {
            completedAt: new Date().toISOString(),
            status: 'completed',
        });
    });
};

// --- DELIVERY ASSIGNMENT & DELIVERY BOY HELPERS ---
export const listDeliveryBoys = async (): Promise<AppUser[]> => {
    try {
        const snapshot = await appUsersCollection.get();
        return snapshot.docs
            .map((doc: any) => ({ uid: doc.id, ...doc.data() } as AppUser))
            .filter((user: AppUser) => user.role === 'delivery_boy' && user.active !== false);
    } catch (e) {
        console.error("Error listing delivery boys:", e);
        return [];
    }
};

export const listAllAppUsers = async (): Promise<AppUser[]> => {
    try {
        const snapshot = await appUsersCollection.get();
        return snapshot.docs.map((doc: any) => ({ uid: doc.id, ...doc.data() } as AppUser));
    } catch (e) {
        console.error("Error listing app users:", e);
        return [];
    }
};

export const assignDelivery = async (params: {
    deliveryId: string;
    assignedTo: string;
    assignedVehicleId: string;
    cylinderType: CylinderType;
}): Promise<void> => {
    const deliveryRef = deliveriesCollection.doc(params.deliveryId);
    await deliveryRef.update({
        status: 'out_for_delivery',
        assignedTo: params.assignedTo,
        assignedVehicleId: params.assignedVehicleId,
        cylinderType: params.cylinderType,
        assignedAt: new Date().toISOString(),
    });
};

export const cancelDelivery = async (deliveryId: string): Promise<void> => {
    const deliveryRef = deliveriesCollection.doc(deliveryId);
    await deliveryRef.update({
        status: 'cancelled',
        completedAt: new Date().toISOString(),
    });
};

// --- STOCK & INVENTORY MANAGEMENT HELPERS ---
export const seedDefaultStockLocations = async (): Promise<StockLocation[]> => {
    const defaultLocations: StockLocation[] = [
        {
            id: 'main_godown',
            name: 'Main Godown',
            type: 'godown',
            stock: {
                '14KG_HP': { filled: 120, empty: 45 },
                '14KG_IN': { filled: 80, empty: 30 },
                '14KG_BH': { filled: 60, empty: 20 },
                '5KG': { filled: 25, empty: 10 },
                'COMMERCIAL': { filled: 15, empty: 5 },
            },
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'counter',
            name: 'Showroom Counter',
            type: 'godown',
            stock: {
                '14KG_HP': { filled: 15, empty: 10 },
                '14KG_IN': { filled: 10, empty: 5 },
                '14KG_BH': { filled: 10, empty: 5 },
                '5KG': { filled: 8, empty: 2 },
                'COMMERCIAL': { filled: 5, empty: 2 },
            },
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'vehicle_1',
            name: 'Delivery Vehicle BR01-1234',
            type: 'vehicle',
            stock: {
                '14KG_HP': { filled: 20, empty: 5 },
                '14KG_IN': { filled: 15, empty: 3 },
                '14KG_BH': { filled: 10, empty: 2 },
                '5KG': { filled: 4, empty: 1 },
                'COMMERCIAL': { filled: 2, empty: 0 },
            },
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'vehicle_2',
            name: 'Delivery Vehicle BR01-5678',
            type: 'vehicle',
            stock: {
                '14KG_HP': { filled: 18, empty: 4 },
                '14KG_IN': { filled: 12, empty: 2 },
                '14KG_BH': { filled: 8, empty: 1 },
                '5KG': { filled: 2, empty: 0 },
                'COMMERCIAL': { filled: 1, empty: 0 },
            },
            updatedAt: new Date().toISOString(),
        },
    ];

    const batch = db.batch();
    for (const loc of defaultLocations) {
        batch.set(stockLocationsCollection.doc(loc.id), loc);
    }
    await batch.commit();
    return defaultLocations;
};

export const listStockLocations = async (): Promise<StockLocation[]> => {
    try {
        const snapshot = await stockLocationsCollection.get();
        if (snapshot.empty) {
            return await seedDefaultStockLocations();
        }
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as StockLocation));
    } catch (e) {
        console.error("Error listing stock locations:", e);
        return [];
    }
};

export const listStockTransactions = async (limitCount = 50): Promise<StockTransaction[]> => {
    try {
        const snapshot = await stockTransactionsCollection.orderBy('createdAt', 'desc').limit(limitCount).get();
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as StockTransaction));
    } catch (e) {
        try {
            const snapshot = await stockTransactionsCollection.get();
            const items = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as StockTransaction));
            return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limitCount);
        } catch (err) {
            console.error("Error listing stock transactions:", err);
            return [];
        }
    }
};

export const transferStock = async (params: {
    cylinderType: CylinderType;
    fromLocationId: string;
    toLocationId: string;
    filledCount: number;
    emptyCount: number;
    note?: string;
    createdByName?: string;
}): Promise<void> => {
    const fromRef = stockLocationsCollection.doc(params.fromLocationId);
    const toRef = stockLocationsCollection.doc(params.toLocationId);

    await db.runTransaction(async (t: any) => {
        const fromDoc = await t.get(fromRef);
        const toDoc = await t.get(toRef);

        if (!fromDoc.exists || !toDoc.exists) throw new Error("Stock location not found");

        const fromData = fromDoc.data();
        const toData = toDoc.data();

        const fromStock = fromData.stock || {};
        const toStock = toData.stock || {};

        const cType = params.cylinderType;
        const currentFrom = fromStock[cType] || { filled: 0, empty: 0 };
        const currentTo = toStock[cType] || { filled: 0, empty: 0 };

        if (currentFrom.filled < params.filledCount || currentFrom.empty < params.emptyCount) {
            throw new Error(`Insufficient stock in ${fromData.name} for transfer.`);
        }

        const newFrom = {
            filled: currentFrom.filled - params.filledCount,
            empty: currentFrom.empty - params.emptyCount,
        };
        const newTo = {
            filled: currentTo.filled + params.filledCount,
            empty: currentTo.empty + params.emptyCount,
        };

        t.update(fromRef, {
            [`stock.${cType}`]: newFrom,
            updatedAt: new Date().toISOString(),
        });
        t.update(toRef, {
            [`stock.${cType}`]: newTo,
            updatedAt: new Date().toISOString(),
        });

        const txRef = stockTransactionsCollection.doc();
        t.set(txRef, sanitize({
            type: 'transfer',
            cylinderType: cType,
            fromLocationId: params.fromLocationId,
            toLocationId: params.toLocationId,
            filledDelta: params.filledCount,
            emptyDelta: params.emptyCount,
            createdAt: new Date().toISOString(),
            createdByName: params.createdByName || 'Admin',
            note: params.note || `Transferred ${params.filledCount} filled & ${params.emptyCount} empty from ${fromData.name} to ${toData.name}`,
        }));
    });
};

export const adjustStock = async (params: {
    locationId: string;
    cylinderType: CylinderType;
    filledDelta: number;
    emptyDelta: number;
    note?: string;
    createdByName?: string;
}): Promise<void> => {
    const locRef = stockLocationsCollection.doc(params.locationId);

    await db.runTransaction(async (t: any) => {
        const locDoc = await t.get(locRef);
        if (!locDoc.exists) throw new Error("Stock location not found");

        const data = locDoc.data();
        const currentStock = (data.stock && data.stock[params.cylinderType]) || { filled: 0, empty: 0 };

        const newFilled = Math.max(0, currentStock.filled + params.filledDelta);
        const newEmpty = Math.max(0, currentStock.empty + params.emptyDelta);

        t.update(locRef, {
            [`stock.${params.cylinderType}`]: { filled: newFilled, empty: newEmpty },
            updatedAt: new Date().toISOString(),
        });

        const txRef = stockTransactionsCollection.doc();
        t.set(txRef, sanitize({
            type: 'adjustment',
            cylinderType: params.cylinderType,
            fromLocationId: params.locationId,
            toLocationId: params.locationId,
            filledDelta: params.filledDelta,
            emptyDelta: params.emptyDelta,
            createdAt: new Date().toISOString(),
            createdByName: params.createdByName || 'Admin',
            note: params.note || `Manual adjustment at ${data.name}: Filled (${params.filledDelta > 0 ? '+' : ''}${params.filledDelta}), Empty (${params.emptyDelta > 0 ? '+' : ''}${params.emptyDelta})`,
        }));
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
        if (isCustomerUnbooked(customer.lastBookingDate, customer.agencyName)) {
            pendingBookings++;
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