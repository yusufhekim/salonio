import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import type { WorkingDays, WorkingHoursMap } from "../store/barberStore";
import { db } from "../lib/firebase";

export type RegisteredBarber = {
  id: string;
  barberShopName: string;
  city: string;
  district: string;
  neighborhood: string;
};

export type CustomerProfileData = {
  role: "customer";
  fullName: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  email: string;
  telefon: string;
  /** Persisted selected barber so customer does not have to reselect. */
  selectedBarberId?: string;
  selectedBarberName?: string;
  selectedBarberCity?: string;
  selectedBarberDistrict?: string;
  selectedBarberNeighborhood?: string;
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
  workingDays?: WorkingDays;
  workingHours?: WorkingHoursMap;
  dayOffDates?: string[];
};

export type UserProfileData = CustomerProfileData | BarberProfileData;

export type BarberScheduleData = {
  workingDays: WorkingDays;
  workingHours: WorkingHoursMap;
  dayOffDates: string[];
};

/**
 * Saves the user profile in Firestore (collection: users, document id: uid).
 * Data shape: CustomerProfileData or BarberProfileData.
 */
export function createUserProfile(uid: string, data: any): Promise<void> {
  return setDoc(doc(db, "users", uid), data);
}

/**
 * Updates customer profile fields in Firestore (merge: true).
 * Use after customer edits profile from ProfileScreen.
 */
export function updateCustomerProfile(
  uid: string,
  data: Partial<Omit<CustomerProfileData, "role">>
): Promise<void> {
  return setDoc(doc(db, "users", uid), data, { merge: true });
}

/**
 * Fetches all registered barbers from Firestore (users where role === "barber").
 */
export async function getRegisteredBarbers(): Promise<RegisteredBarber[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "barber")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      barberShopName: data.barberShopName ?? "",
      city: data.city ?? "",
      district: data.district ?? "",
      neighborhood: data.neighborhood ?? "",
    };
  });
}

/**
 * Updates barber profile fields in Firestore (merge: true).
 * Use when barber edits name, address, contact from BarberProfileScreen.
 */
export function updateBarberProfile(
  uid: string,
  data: Partial<Omit<BarberProfileData, "role">>
): Promise<void> {
  return setDoc(doc(db, "users", uid), data, { merge: true });
}

/**
 * Updates barber schedule fields in Firestore (merge: true).
 * Does not overwrite existing profile fields (email, fullName, etc.).
 */
export function updateBarberSchedule(
  uid: string,
  data: BarberScheduleData
): Promise<void> {
  return setDoc(doc(db, "users", uid), data, { merge: true });
}
