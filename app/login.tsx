import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";

const COLORS = {
  green: "#3DBE8B",
  greenDark: "#2da876",
  bodyBg: "#F7F8FA",
  dark: "#101828",
  gray: "#4A5568",
  inputBorder: "#E5E8EC",
  white: "#FFFFFF",
  placeholder: "#A0AEC0",
  googleBlue: "#1677F2",
  divider: "#E5E8EC",
  infoBlue: "#EBF4FF",
  infoBlueBorder: "#BFDBFE",
  infoBluText: "#1E40AF",
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = () => {
    // Navigate to main app on sign in
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.green} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Header ─── */}
          <View style={styles.header}>
            <View style={styles.cartIconWrapper}>
              <Text style={styles.cartIcon}>🛒</Text>
            </View>
            <Text style={styles.appName}>Grocery Buddy</Text>
            <Text style={styles.tagline}>Smart shopping for busy families</Text>
          </View>

          {/* ─── Body ─── */}
          <View style={styles.body}>
            <Text style={styles.welcomeText}>Welcome Back</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotWrapper}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                !(email && password) && styles.signInButtonDisabled,
              ]}
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>

            {/* OR divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={styles.socialText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Continue with Apple */}
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
              <Text style={[styles.socialIcon, { fontWeight: "700" }]}>🍎</Text>
              <Text style={styles.socialText}>Continue with Apple</Text>
            </TouchableOpacity>

            {/* Sign Up link */}
            <View style={styles.signUpRow}>
              <Text style={styles.signUpPrompt}>Don't have an account? </Text>
              <TouchableOpacity>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Cognito info box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🔐 Authentication powered by AWS Cognito. Your data is securely
                stored and never shared.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.green,
  },

  // ─── Header ───
  header: {
    backgroundColor: COLORS.green,
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  cartIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cartIcon: {
    fontSize: 30,
  },
  appName: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },

  // ─── Body ───
  body: {
    flex: 1,
    backgroundColor: COLORS.bodyBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 24,
  },

  // ─── Input ───
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },
  eyeIcon: {
    fontSize: 16,
    paddingLeft: 8,
  },

  // ─── Forgot Password ───
  forgotWrapper: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.green,
  },

  // ─── Sign In Button ───
  signInButton: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  signInButtonDisabled: {
    opacity: 0.5,
  },
  signInText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },

  // ─── Divider ───
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontSize: 13,
    color: COLORS.gray,
  },

  // ─── Social Buttons ───
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    height: 50,
    marginBottom: 12,
  },
  socialIcon: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.googleBlue,
    marginRight: 10,
    width: 20,
    textAlign: "center",
  },
  socialText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.dark,
  },

  // ─── Sign Up ───
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  signUpPrompt: {
    fontSize: 14,
    color: COLORS.gray,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.green,
  },

  // ─── Info Box ───
  infoBox: {
    backgroundColor: COLORS.infoBlue,
    borderWidth: 1,
    borderColor: COLORS.infoBlueBorder,
    borderRadius: 10,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.infoBluText,
    lineHeight: 18,
  },
});
