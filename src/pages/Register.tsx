import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../lib/firebase";
import { createUserProfile } from "../services/userService";

export default function Register() {
  const navigation = useNavigation<any>();

  const [role, setRole] = useState<"customer" | "barber">("customer");
  const [fullName, setFullName] = useState("");
  const [barberShopName, setBarberShopName] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!fullName.trim()) {
      setError("Ad Soyad gereklidir.");
      return;
    }
    if (role === "barber" && !barberShopName.trim()) {
      setError("Kuaför / Salon adı gereklidir.");
      return;
    }
    if (!city.trim()) {
      setError("İl gereklidir.");
      return;
    }
    if (!district.trim()) {
      setError("İlçe gereklidir.");
      return;
    }
    if (!neighborhood.trim()) {
      setError("Mahalle gereklidir.");
      return;
    }
    if (!address.trim()) {
      setError("Adres gereklidir.");
      return;
    }
    if (!telefon.trim()) {
      setError("Telefon gereklidir.");
      return;
    }
    if (!/^05\d{9}$/.test(telefon.trim())) {
      setError("Geçerli bir telefon giriniz (05XXXXXXXXX).");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre gereklidir.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const uid = userCredential.user.uid;

      if (role === "customer") {
        await createUserProfile(uid, {
          role: "customer",
          fullName: fullName.trim(),
          city: city.trim(),
          district: district.trim(),
          neighborhood: neighborhood.trim(),
          address: address.trim(),
          email: email.trim(),
          telefon: telefon.trim(),
        });
      } else {
        await createUserProfile(uid, {
          role: "barber",
          barberShopName: barberShopName.trim(),
          fullName: fullName.trim(),
          city: city.trim(),
          district: district.trim(),
          neighborhood: neighborhood.trim(),
          address: address.trim(),
          email: email.trim(),
          telefon: telefon.trim(),
        });
      }
    } catch (err: any) {
      const message =
        err?.code === "auth/email-already-in-use"
          ? "Bu e-posta adresi zaten kullanılıyor."
          : err?.code === "auth/weak-password"
            ? "Şifre çok zayıf. En az 6 karakter kullanın."
            : err?.code === "auth/invalid-email"
              ? "Geçersiz e-posta adresi."
              : "Kayıt başarısız. Lütfen tekrar deneyin.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Kayıt Ol</Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, role === "customer" && styles.roleButtonSelected]}
            onPress={() => setRole("customer")}
          >
            <Text style={[styles.roleButtonText, role === "customer" && styles.roleButtonTextSelected]}>
              Müşteri
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === "barber" && styles.roleButtonSelected]}
            onPress={() => setRole("barber")}
          >
            <Text style={[styles.roleButtonText, role === "barber" && styles.roleButtonTextSelected]}>
              Kuaför
            </Text>
          </TouchableOpacity>
        </View>

        {role === "barber" && (
          <TextInput
            style={styles.input}
            placeholder="Kuaför / Salon Adı"
            placeholderTextColor="#9CA3AF"
            value={barberShopName}
            onChangeText={(t) => { setBarberShopName(t); setError(""); }}
            editable={!loading}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Ad Soyad"
          placeholderTextColor="#9CA3AF"
          value={fullName}
          onChangeText={(t) => { setFullName(t); setError(""); }}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="İl"
          placeholderTextColor="#9CA3AF"
          value={city}
          onChangeText={(t) => { setCity(t); setError(""); }}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="İlçe"
          placeholderTextColor="#9CA3AF"
          value={district}
          onChangeText={(t) => { setDistrict(t); setError(""); }}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Mahalle"
          placeholderTextColor="#9CA3AF"
          value={neighborhood}
          onChangeText={(t) => { setNeighborhood(t); setError(""); }}
          editable={!loading}
        />

        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Adres"
          placeholderTextColor="#9CA3AF"
          value={address}
          onChangeText={(t) => { setAddress(t); setError(""); }}
          multiline
          numberOfLines={2}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Telefon (05XXXXXXXXX)"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={telefon}
          onChangeText={(t) => { setTelefon(t); setError(""); }}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(t) => { setEmail(t); setError(""); }}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre (en az 6 karakter)"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); setError(""); }}
          editable={!loading}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Zaten hesabın var mı? <Text style={styles.linkBold}>Giriş Yap</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  inner: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
    color: "#111827",
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  roleButtonSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  roleButtonTextSelected: {
    color: "#FFFFFF",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  inputMultiline: {
    minHeight: 56,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    color: "#6B7280",
  },
  linkBold: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
