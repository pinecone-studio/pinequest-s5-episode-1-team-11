import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  Button,
  Card,
  colors,
  Problem,
  Screen,
  styles,
} from "../components/ui";

type Mode = "login" | "register";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const inFlight = useRef(false);
  const registering = mode === "register";

  function switchMode(next: Mode) {
    if (inFlight.current) return;
    setMode(next);
    setError(null);
    setConfirmationEmail(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function submit() {
    if (inFlight.current) return;
    const address = email.trim();
    if (!address || !password) {
      setError("Email болон нууц үгээ оруулна уу.");
      return;
    }
    if (registering && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Email хаягаа зөв оруулна уу.");
      return;
    }
    if (registering && password.length < 8) {
      setError("Нууц үг 8-аас доошгүй тэмдэгттэй байна.");
      return;
    }
    if (registering && password !== confirmPassword) {
      setError("Хоёр нууц үг ижил биш байна.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = registering
        ? await supabase.auth.signUp({ email: address, password })
        : await supabase.auth.signInWithPassword({ email: address, password });
      if (result.error) {
        const messages: Record<string, string> = {
          email_not_confirmed:
            "Email хаягаа баталгаажуулаад дахин нэвтэрнэ үү.",
          signup_disabled: "Шинэ хэрэглэгчийн бүртгэл одоогоор хаалттай байна.",
          email_address_invalid: "Email хаягаа зөв оруулна уу.",
          weak_password:
            "Нууц үг бүртгэлийн шаардлага хангахгүй байна. Илүү урт, үсэг болон тоотой нууц үг сонгоно уу.",
          over_email_send_rate_limit:
            "Email илгээх хязгаарт хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.",
          over_request_rate_limit: "Түр хүлээгээд дахин оролдоно уу.",
        };
        setError(
          messages[result.error.code ?? ""] ??
            (registering
              ? "Бүртгэж чадсангүй. Өмнө бүртгүүлсэн бол нэвтрэх хэсгийг ашиглана уу."
              : "Нэвтэрч чадсангүй. Email болон нууц үгээ шалгана уу."),
        );
        return;
      }
      setPassword("");
      setConfirmPassword("");
      if (registering && !result.data.session) setConfirmationEmail(address);
      // AuthProvider handles navigation when Supabase returns a session.
    } catch {
      setError(
        "Холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { flexGrow: 1, justifyContent: "center" },
          ]}
        >
          <View style={{ alignItems: "center", marginBottom: 24, gap: 12 }}>
            <Text
              style={{
                color: colors.primary,
                fontSize: 58,
                fontWeight: "800",
                letterSpacing: -3,
              }}
            >
              Halo
            </Text>
            <Text style={styles.heading}>Ухаалаг хяналт. Тайван амьдрал.</Text>
            <Text style={styles.muted}>
              {registering
                ? "Таны бүртгүүлэх хэсэг"
                : "Таны нэвтрэх хэсэг"}
            </Text>
          </View>
          {confirmationEmail ? (
            <>
              <Card>
                <Text style={styles.heading} accessibilityLiveRegion="polite">
                  Email-ээ шалгана уу
                </Text>
                <Text style={styles.text}>{confirmationEmail}</Text>
                <Text style={styles.muted}>
                  Email-д ирсэн баталгаажуулах холбоосыг нээгээд, энэ app руу
                  буцаж нэвтэрнэ үү.
                </Text>
              </Card>
              <Button
                title="Нэвтрэх хэсэг рүү"
                onPress={() => switchMode("login")}
              />
            </>
          ) : (
            <>
              <Text style={styles.text}>Email</Text>
              <TextInput
                accessibilityLabel="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                editable={!busy}
              />
              <Text style={styles.text}>Нууц үг</Text>
              <TextInput
                accessibilityLabel="Нууц үг"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder={registering ? "8-аас доошгүй тэмдэгт" : "Нууц үг"}
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={registering ? "new-password" : "current-password"}
                textContentType={registering ? "newPassword" : "password"}
                editable={!busy}
                onSubmitEditing={() => {
                  if (!registering) void submit();
                }}
              />
              {registering && (
                <>
                  <Text style={styles.text}>Нууц үг давтах</Text>
                  <TextInput
                    accessibilityLabel="Нууц үг давтах"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={styles.input}
                    placeholder="Нууц үгээ дахин оруулна уу"
                    placeholderTextColor={colors.muted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    editable={!busy}
                    onSubmitEditing={() => {
                      void submit();
                    }}
                  />
                </>
              )}
              {error && <Problem text={error} />}
              <Button
                title={registering ? "Бүртгүүлэх" : "Нэвтрэх"}
                busy={busy}
                onPress={() => {
                  void submit();
                }}
              />
              <Button
                title={
                  registering ? "Бүртгэлтэй бол нэвтрэх" : "Бүртгүүлэх"
                }
                secondary
                disabled={busy}
                onPress={() => switchMode(registering ? "login" : "register")}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
