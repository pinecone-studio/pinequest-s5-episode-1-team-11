import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SITE, supabase } from "../lib/supabase";
import { Rise } from "../components/motion";
import { StatusOrb } from "../components/StatusOrb";
import { authErrorMessage } from "../lib/auth-errors";
import {
  Button,
  Card,
  colors,
  fonts,
  Problem,
  Screen,
  styles,
} from "../components/ui";

type Mode = "login" | "register";
// Mobile confirmation finishes at Supabase; the web callback requires a browser PKCE verifier.
const confirmationRedirect = new URL("/login", SITE).toString();

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
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function resendConfirmation() {
    const address = confirmationEmail?.trim();
    if (!address) return setError("Email хаягаа оруулна уу.");
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { error: failed } = await supabase.auth.resend({
        type: "signup",
        email: address,
        options: { emailRedirectTo: confirmationRedirect },
      });
      if (failed) {
        setError(authErrorMessage(failed));
        return;
      }
      setNotice(
        "Баталгаажуулах email дахин илгээгдлээ. Spam хавтсаа мөн шалгана уу.",
      );
    } catch (failed) {
      setError(authErrorMessage(failed));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function openRecovery() {
    setError(null);
    setNotice(null);
    try {
      // Start and finish recovery in the browser so its PKCE verifier stays in the same storage.
      await Linking.openURL(new URL("/forgot-password", SITE).toString());
      setNotice(
        "Нээгдсэн браузерт email хаягаа оруулж, ирсэн холбоосыг тэр браузерт нээнэ үү. Нууц үгээ солиод app руу буцаж нэвтэрнэ үү.",
      );
    } catch {
      setError("Нууц үг сэргээх хуудсыг нээж чадсангүй. Дахин оролдоно уу.");
    }
  }
  const registering = mode === "register";

  function switchMode(next: Mode) {
    if (inFlight.current) return;
    setMode(next);
    setError(null);
    setNotice(null);
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
    setNotice(null);
    try {
      const result = registering
        ? await supabase.auth.signUp({
            email: address,
            password,
            options: { emailRedirectTo: confirmationRedirect },
          })
        : await supabase.auth.signInWithPassword({ email: address, password });
      if (result.error) {
        if (result.error.code === "email_not_confirmed")
          setConfirmationEmail(address);
        setError(authErrorMessage(result.error));
        return;
      }
      setPassword("");
      setConfirmPassword("");
      if (registering && !result.data.session) setConfirmationEmail(address);
      // AuthProvider handles navigation when Supabase returns a session.
    } catch (failed) {
      setError(authErrorMessage(failed));
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
          <Rise style={{ alignItems: "center", gap: 8 }}>
            <StatusOrb state="calm">
              <Text style={local.brand}>Halo</Text>
            </StatusOrb>
            <Text style={[styles.title, { textAlign: "center" }]}>
              Ухаалаг хяналт.{"\n"}Тайван амьдрал.
            </Text>
            <Text style={styles.muted}>
              {registering ? "Шинэ бүртгэл үүсгэх" : "Бүртгэлээрээ нэвтрэх"}
            </Text>
          </Rise>
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
                title="Email дахин илгээх"
                secondary
                busy={busy}
                onPress={() => void resendConfirmation()}
              />
              {notice && <Text style={styles.badge}>{notice}</Text>}
              {error && <Problem text={error} />}
              <Button
                title="Нэвтрэх хэсэг рүү"
                disabled={busy}
                onPress={() => switchMode("login")}
              />
            </>
          ) : (
            <>
              <Rise index={1} style={local.field}>
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
              </Rise>
              <Rise index={2} style={local.field}>
                <Text style={styles.text}>Нууц үг</Text>
                <TextInput
                  accessibilityLabel="Нууц үг"
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholder={
                    registering ? "8-аас доошгүй тэмдэгт" : "Нууц үг"
                  }
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  textContentType={registering ? "newPassword" : "password"}
                  editable={!busy}
                  onSubmitEditing={() => {
                    if (!registering) void submit();
                  }}
                />
              </Rise>
              {registering && (
                <Rise style={local.field}>
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
                </Rise>
              )}
              {error && <Problem text={error} />}
              {notice && <Text style={styles.badge}>{notice}</Text>}
              <Button
                title={registering ? "Бүртгүүлэх" : "Нэвтрэх"}
                busy={busy}
                onPress={() => {
                  void submit();
                }}
              />
              <Button
                title={registering ? "Бүртгэлтэй бол нэвтрэх" : "Бүртгүүлэх"}
                secondary
                disabled={busy}
                onPress={() => switchMode(registering ? "login" : "register")}
              />
              {!registering && (
                <Button
                  title="Нууц үгээ мартсан"
                  textOnly
                  disabled={busy}
                  onPress={() => void openRecovery()}
                />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const local = StyleSheet.create({
  field: { gap: 8 },
  brand: { color: colors.onPrimary, fontFamily: fonts.display, fontSize: 26 },
});
