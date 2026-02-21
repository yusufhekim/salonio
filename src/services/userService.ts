import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export type CustomerProfileData = {
  role: "customer";
  fullName: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  email: string;
  telefon: string;
};

export type BarberProfileData = {
  role: "barber";
  barberShopName: string;
  fullName: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  email: string;
  telefon: string;
};

export type UserProfileData = CustomerProfileData | BarberProfileData;

/**
 * Saves the user profile in Firestore (collection: users, document id: uid).
 * Data shape: CustomerProfileData or BarberProfileData.
 */
export function createUserProfile(uid: string, data: any): Promise<void> {
  return setDoc(doc(db, "users", uid), data);
}
