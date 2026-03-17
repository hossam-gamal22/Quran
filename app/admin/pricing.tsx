// app/admin/pricing.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { CountryPricing } from '../../types/admin';
import { t } from '@/lib/i18n';
import { useIsRTL } from '@/hooks/use-is-rtl';
export default function PricingScreen() {
  const [pricing, setPricing] = useState<CountryPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<CountryPricing | null>(null);
  const [formData, setFormData] = useState<CountryPricing>({
    countryCode: '',
    countryName: '',
    currency: '',
    currencySymbol: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    isActive: true,
  });

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const data = await adminService.getAllPricing();
      setPricing(data);
    } catch (error) {
      console.error('Error loading pricing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPricing(null);
    setFormData({
      countryCode: '',
      countryName: '',
      currency: '',
      currencySymbol: '',
      monthlyPrice: 0,
      yearlyPrice: 0,
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (item: CountryPricing) => {
    setEditingPricing(item);
    setFormData(item);
    setShowModal(true);
  };

  const savePricing = async () => {
    if (!formData.countryCode || !formData.countryName) {
      Alert.alert(t('common.error'), t('admin.fillAllFields'));
      return;
    }

    try {
      const success = await adminService.setCountryPricing(formData);
      if (success) {
        Alert.alert(t('common.done'), t('admin.priceSaved'));
        setShowModal(false);
        loadPricing();
      } else {
        Alert.alert(t('common.error'), t('admin.priceSaveFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.unexpectedError'));
    }
  };

  const deletePricing = async (countryCode: string) => {
    Alert.alert(
      t('admin.confirmDelete'),
      t('admin.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await adminService.deleteCountryPricing(countryCode);
            if (success) {
              loadPricing();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Add Button */}
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add-circle" size={24} color={Colors.textLight} />
          <Text style={styles.addBtnText}>{t('admin.addPrice')}</Text>
        </TouchableOpacity>

        {/* Pricing List */}
        <View style={styles.list}>
          {pricing.map((item) => (
            <View key={item.countryCode} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryCode}>{item.countryCode}</Text>
                  <Text style={styles.countryName}>{item.countryName}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="pencil" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => deletePricing(item.countryCode)}
                  >
                    <Ionicons name="trash" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.pricesRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>{t('common.monthly')}</Text>
                  <Text style={styles.priceValue}>
                    {item.currencySymbol}{item.monthlyPrice}
                  </Text>
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>{t('common.yearly')}</Text>
                  <Text style={styles.priceValue}>
                    {item.currencySymbol}{item.yearlyPrice}
                  </Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <Text
                  style={[
                    styles.statusText,
                    { color: item.isActive ? Colors.success : Colors.error },
                  ]}
                >
                  {item.isActive ? t('admin.enabled') : t('admin.disabled')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {pricing.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{t('admin.noPrices')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingPricing ? t('admin.editPrice') : t('admin.addPrice')}
            </Text>
            <TouchableOpacity onPress={savePricing}>
              <Text style={styles.saveText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('admin.countryCodeLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.countryCode}
                onChangeText={(value) =>
                  setFormData({ ...formData, countryCode: value.toUpperCase() })
                }
                placeholder="EG"
                placeholderTextColor={Colors.textMuted}
                maxLength={2}
                editable={!editingPricing}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('admin.countryNameLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.countryName}
                onChangeText={(value) =>
                  setFormData({ ...formData, countryName: value })
                }
                placeholder="مصر"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('admin.currencyLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.currency}
                onChangeText={(value) =>
                  setFormData({ ...formData, currency: value.toUpperCase() })
                }
                placeholder="EGP"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('admin.currencySymbolLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.currencySymbol}
                onChangeText={(value) =>
                  setFormData({ ...formData, currencySymbol: value })
                }
                placeholder="ج.م"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('admin.monthlyPrice')}</Text>
              <TextInput
                style={styles.input}
                value={String(formData.monthlyPrice)}
                onChangeText={(value) =>
                  setFormData({ ...formData, monthlyPrice: parseFloat(value) || 0 })
                }
                placeholder="49"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('admin.yearlyPrice')}</Text>
              <TextInput
                style={styles.input}
                value={String(formData.yearlyPrice)}
                onChangeText={(value) =>
                  setFormData({ ...formData, yearlyPrice: parseFloat(value) || 0 })
                }
                placeholder="399"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  list: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textLight,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  pricesRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  priceItem: {},
  priceLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalContent: {
    padding: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
