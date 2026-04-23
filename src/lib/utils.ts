import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  // Pemetaan pesan kesalahan ke Bahasa Indonesia agar ramah pengguna
  let pesanUser = "Terjadi kesalahan, silakan coba lagi";
  const errorMentah = errInfo.error.toLowerCase();

  if (errorMentah.includes('permission-denied') || errorMentah.includes('insufficient permissions')) {
    pesanUser = "Akses ditolak. Anda tidak memiliki izin.";
  } else if (errorMentah.includes('not-found')) {
    pesanUser = "Data atau ID tidak ditemukan.";
  } else if (errorMentah.includes('unauthenticated')) {
    pesanUser = "Sesi berakhir, silakan masuk kembali.";
  } else if (errorMentah.includes('quota-exceeded')) {
    pesanUser = "Batas kapasitas tercapai, silakan coba lagi nanti.";
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(pesanUser);
}
