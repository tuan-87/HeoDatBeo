import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { X } from 'lucide-react-native';
import { styles } from '../../styles/SettingsScreen';

interface LanguageSelectModalProps {
  visible: boolean;
  onClose: () => void;
  language: string;
  onSelectLanguage: (lang: 'vi' | 'en' | 'de') => void;
  t: (key: string) => string;
}

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
  visible,
  onClose,
  language,
  onSelectLanguage,
  t,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlayCenter}>
        <View style={styles.settingsModalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('settings.selectLanguage')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#0f172a" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingGroup}>
              <TouchableOpacity
                style={[
                  styles.settingOption,
                  language === 'vi' && styles.settingOptionActive,
                ]}
                onPress={() => {
                  onSelectLanguage('vi');
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.settingOptionTitle,
                    language === 'vi' && styles.settingOptionTextActive,
                  ]}
                >
                  🇻🇳 {t('settings.vi')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.settingOption,
                  language === 'en' && styles.settingOptionActive,
                ]}
                onPress={() => {
                  onSelectLanguage('en');
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.settingOptionTitle,
                    language === 'en' && styles.settingOptionTextActive,
                  ]}
                >
                  🇺🇸 {t('settings.en')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.settingOption,
                  language === 'de' && styles.settingOptionActive,
                ]}
                onPress={() => {
                  onSelectLanguage('de');
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.settingOptionTitle,
                    language === 'de' && styles.settingOptionTextActive,
                  ]}
                >
                  🇩🇪 {t('settings.de')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeSettingsBtn}
            onPress={onClose}
          >
            <Text style={styles.closeSettingsBtnText}>
              {t('common.close')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

