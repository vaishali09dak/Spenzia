import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
// Removed: import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ExpenseTrackerModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('📦');
  const [categoryColor, setCategoryColor] = useState('#5DADE2');

  const categories = [
    { name: 'Food', color: '#5DADE2', icon: '🍔' },
    { name: 'Transport', color: '#F4D03F', icon: '🚗' },
    { name: 'Shopping', color: '#EC7063', icon: '🛍️' },
    { name: 'Entertainment', color: '#AF7AC5', icon: '🎬' },
    { name: 'Health', color: '#52BE80', icon: '💊' },
    { name: 'Bills', color: '#E59866', icon: '📄' },
    { name: 'Education', color: '#5DADE2', icon: '📚' },
    { name: 'Other', color: '#48C9B0', icon: '📦' },
  ];
  const availableColors = [
    '#5DADE2', '#F4D03F', '#EC7063', '#AF7AC5',
    '#52BE80', '#E59866', '#48C9B0', '#3498DB',
    '#E74C3C', '#9B59B6', '#1ABC9C', '#F39C12',
  ];
  const emojiOptions = [
    '🍔', '🚗', '🛍️', '🎬', '💊', '📄', '📚', '📦',
    '🏠', '✈️', '💰', '🎮', '☕', '🎨', '💼', '🎯',
    '⚡', '🔥', '💎', '🌟', '🎵', '📱', '💻', '🏋️',
  ];
  const options = [
    // Keeping only the first color as the background color
    { id: 'expense', title: 'Add Expense', subtitle: 'Track your spending', icon: '📉', color: '#F093FB' }, 
    { id: 'income', title: 'Add Income', subtitle: 'Record your earnings', icon: '📈', color: '#11998E' }, 
    { id: 'category', title: 'New Category', subtitle: 'Create custom category', icon: '🏷️', color: '#4FACFE' },
  ];

  const handleSubmit = () => {
    console.log({ selectedOption, amount, description, selectedCategory, categoryName, categoryEmoji, categoryColor });
    setShowModal(false);
    setSelectedOption(null);
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setCategoryName('');
    setCategoryEmoji('📦');
    setCategoryColor('#5DADE2');
  };

  const renderOptionCard = (option) => (
    <TouchableOpacity
      key={option.id}
      onPress={() => setSelectedOption(option.id)}
      activeOpacity={0.8}
      style={styles.optionCard}
    >
      {/* Replaced LinearGradient with View and used the solid color */}
      <View style={[styles.optionGradient, { backgroundColor: option.color }]}>
        <View style={styles.optionContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.optionIcon}>{option.icon}</Text>
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryGrid = () => (
    <View>
      <Text style={styles.label}>Select Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            onPress={() => setSelectedCategory(cat.name)}
            activeOpacity={0.7}
            style={[
              styles.categoryButton,
              {
                backgroundColor: selectedCategory === cat.name ? cat.color : `${cat.color}15`,
                borderColor: selectedCategory === cat.name ? cat.color : 'transparent',
                borderWidth: 2.5,
              },
            ]}
          >
            <Text style={styles.categoryEmoji}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryName,
                { color: selectedCategory === cat.name ? '#fff' : '#374151' },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderNewCategoryForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category Name</Text>
        <TextInput
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="e.g., Groceries, Gym"
          placeholderTextColor="#9CA3AF"
          style={styles.textInput}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Choose Icon</Text>
        <ScrollView
          horizontal={false}
          style={styles.emojiScrollView}
          contentContainerStyle={styles.emojiGrid}
        >
          {emojiOptions.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => setCategoryEmoji(emoji)}
              activeOpacity={0.7}
              style={[
                styles.emojiButton,
                categoryEmoji === emoji && styles.emojiButtonSelected,
              ]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pick Color</Text>
        <View style={styles.colorGrid}>
          {availableColors.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setCategoryColor(color)}
              activeOpacity={0.7}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                categoryColor === color && styles.colorButtonSelected,
              ]}
            >
              {categoryColor === color && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>PREVIEW</Text>
        <View style={styles.previewContent}>
          <View
            style={[
              styles.previewIcon,
              { backgroundColor: categoryColor },
            ]}
          >
            <Text style={styles.previewEmoji}>{categoryEmoji}</Text>
          </View>
          <View>
            <Text style={styles.previewName}>
              {categoryName || 'Category Name'}
            </Text>
            <Text style={styles.previewSubtext}>New category</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Replaced LinearGradient with View and a single background color */}
      <View style={styles.background}>
        <StatusBar barStyle="dark-content" />
        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
          style={styles.fab}
        >
          {/* Replaced LinearGradient with View and a single background color */}
          <View style={styles.fabSolidBackground}>
            <Text style={styles.fabIcon}>+</Text>
          </View>
        </TouchableOpacity>
        {/* Modal (rest of the modal is unchanged) */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowModal(false);
                setSelectedOption(null);
              }}
            />
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.dragHandle} />
                <View style={styles.headerRow}>
                  <Text style={styles.modalTitle}>
                    {selectedOption
                      ? options.find((o) => o.id === selectedOption)?.title
                      : 'Quick Actions'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowModal(false);
                      setSelectedOption(null);
                    }}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
                {!selectedOption && (
                  <Text style={styles.modalSubtitle}>
                    Choose an action to continue
                  </Text>
                )}
              </View>
              {/* Modal Body */}
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {!selectedOption ? (
                  <View style={styles.optionsContainer}>
                    {options.map((option) => renderOptionCard(option))}
                  </View>
                ) : (
                  <View style={styles.formWrapper}>
                    {/* Amount Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Amount</Text>
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.rupeeSymbol}>₹</Text>
                        <TextInput
                          value={amount}
                          onChangeText={setAmount}
                          placeholder="0"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          style={styles.amountInput}
                        />
                      </View>
                    </View>
                    {/* Category Selection or New Category Form */}
                    {selectedOption !== 'category' ? (
                      <>
                        {renderCategoryGrid()}
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Description (Optional)</Text>
                          <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add a note about this transaction..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={3}
                            style={styles.descriptionInput}
                          />
                        </View>
                      </>
                    ) : (
                      renderNewCategoryForm()
                    )}
                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        onPress={() => setSelectedOption(null)}
                        style={[styles.button, styles.backButton]}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.backButtonText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.button, styles.submitButton]}
                        activeOpacity={0.8}
                      >
                        {/* Replaced LinearGradient with View and a single background color */}
                        <View 
                          style={[
                            styles.submitGradient,
                            { 
                              backgroundColor: 
                                selectedOption === 'expense'
                                  ? '#F093FB' // First color from original expense gradient
                                  : selectedOption === 'income'
                                  ? '#11998E' // First color from original income gradient
                                  : '#4FACFE'  // First color from original category gradient
                            }
                          ]}
                        >
                          <Text style={styles.submitButtonText}>
                            {selectedOption === 'category'
                              ? 'Create Category'
                              : 'Save Transaction'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Replaced gradient colors with a single, light blue color
  background: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#EFF6FF', // Using the first color from the original gradient
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // New style to replace fabGradient with solid color
  fabSolidBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#60A5FA', // Using the first color from the original gradient
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: height * 0.88,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  optionsContainer: {
    padding: 24,
    gap: 14,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  // Style for the option card background (was optionGradient)
  optionGradient: {
    padding: 20,
    // The background color is now set dynamically in renderOptionCard
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 32,
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  optionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  formWrapper: {
    padding: 24,
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rupeeSymbol: {
    fontSize: 32,
    fontWeight: '800',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    width: (width - 72) / 4,
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emojiScrollView: {
    maxHeight: 160,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  emojiText: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: (width - 96) / 6,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  checkmark: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  previewContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderRadius: 20,
    padding: 20,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: 1,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  previewEmoji: {
    fontSize: 32,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  previewSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  descriptionInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: -0.2,
  },
  submitButton: {
    overflow: 'hidden',
  },
  // Style for the submit button background (was submitGradient)
  submitGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // The background color is set dynamically in the JSX
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
});

export default ExpenseTrackerModal;