// components/ui/ErrorBoundary.tsx
// معالج الأخطاء العام - روح المسلم

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ========================================
// الأنواع
// ========================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ========================================
// المكون
// ========================================

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // تسجيل الخطأ (يمكن إرساله لـ Analytics)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // يمكن إرسال الخطأ لخدمة تتبع الأخطاء مثل Sentry
    // Sentry.captureException(error);
  }

  handleReload = async () => {
    try {
      // محاولة إعادة تحميل التطبيق
      await Updates.reloadAsync();
    } catch (e) {
      // إذا فشل، إعادة تعيين الحالة فقط
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // عرض واجهة الخطأ المخصصة
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <LinearGradient
            colors={['#11151c', '#1a1a2e']}
            style={styles.gradient}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* الأيقونة */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#e74c3c', '#c0392b']}
                  style={styles.iconGradient}
                >
                  <MaterialCommunityIcons name="alert-circle" size={60} color="#fff" />
                </LinearGradient>
              </View>

              {/* العنوان */}
              <Text style={styles.title}>حدث خطأ غير متوقع</Text>
              
              {/* الوصف */}
              <Text style={styles.description}>
                نعتذر عن هذا الخطأ. يرجى إعادة تشغيل التطبيق أو المحاولة مرة أخرى.
              </Text>

              {/* تفاصيل الخطأ (للمطورين) */}
              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorTitle}>تفاصيل الخطأ:</Text>
                  <ScrollView style={styles.errorScroll} nestedScrollEnabled>
                    <Text style={styles.errorText}>
                      {this.state.error.toString()}
                    </Text>
                    {this.state.errorInfo && (
                      <Text style={styles.errorStack}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* الأزرار */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={this.handleReload}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#2f7659', '#1d5a3a']}
                    style={styles.buttonGradient}
                  >
                    <MaterialCommunityIcons name="reload" size={22} color="#fff" />
                    <Text style={styles.buttonText}>إعادة تشغيل التطبيق</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={this.handleReset}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                  <Text style={styles.secondaryButtonText}>المحاولة مرة أخرى</Text>
                </TouchableOpacity>
              </View>

              {/* رسالة الدعم */}
              <View style={styles.supportContainer}>
                <MaterialCommunityIcons name="help-circle" size={18} color="#666" />
                <Text style={styles.supportText}>
                  إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني
                </Text>
              </View>

              {/* دعاء */}
              <Text style={styles.dua}>
                اللهم يسر ولا تعسر
              </Text>
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11151c',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    maxHeight: 200,
  },
  errorTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorScroll: {
    maxHeight: 150,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  errorStack: {
    fontSize: 10,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2f7659',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
  },
  supportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  supportText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  dua: {
    fontSize: 16,
    fontFamily: 'Cairo-Medium',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
});

export default ErrorBoundary;
