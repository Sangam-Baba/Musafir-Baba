import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from '../components/Button';

// Mock File Type
interface AppFile {
  uri: string;
  name: string;
  type: string;
}

export const KYCDocumentsScreen = () => {
  const [aadhaarFront, setAadhaarFront] = useState<AppFile | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<AppFile | null>(null);
  const [panCard, setPanCard] = useState<AppFile | null>(null);

  const mockPickFile = (setFile: React.Dispatch<React.SetStateAction<AppFile | null>>, docName: string) => {
    // In production, use react-native-document-picker or react-native-image-crop-picker here
    setFile({
      uri: `file:///mock/path/to/${docName}.jpg`,
      name: `${docName}.jpg`,
      type: 'image/jpeg'
    });
  };

  const onSubmit = () => {
    if (!aadhaarFront || !aadhaarBack || !panCard) {
      return;
    }
    console.log('Uploading KYC Docs...', { aadhaarFront, aadhaarBack, panCard });
    // TODO: Wire up presigned URL generation and R2 upload
  };

  const DocumentUploadCard = ({ title, file, onPress }: { title: string, file: AppFile | null, onPress: () => void }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {file ? (
        <View style={styles.fileRow}>
          <Text style={styles.fileName}>{file.name}</Text>
          <TouchableOpacity onPress={() => onPress()}><Text style={styles.reuploadText}>Replace</Text></TouchableOpacity>
        </View>
      ) : (
        <Button title="Upload File" type="outline" onPress={onPress} />
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>KYC Documents</Text>
      <Text style={styles.subtitle}>Upload clear photos or PDFs of your documents.</Text>

      <DocumentUploadCard 
        title="Aadhaar Card (Front)" 
        file={aadhaarFront} 
        onPress={() => mockPickFile(setAadhaarFront, 'aadhaar_front')} 
      />
      <DocumentUploadCard 
        title="Aadhaar Card (Back)" 
        file={aadhaarBack} 
        onPress={() => mockPickFile(setAadhaarBack, 'aadhaar_back')} 
      />
      <DocumentUploadCard 
        title="PAN Card" 
        file={panCard} 
        onPress={() => mockPickFile(setPanCard, 'pan_card')} 
      />

      <View style={styles.footer}>
        <Button 
          title="Upload & Save" 
          onPress={onSubmit} 
          disabled={!aadhaarFront || !aadhaarBack || !panCard} 
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 6,
  },
  fileName: {
    fontSize: 14,
    color: '#2E7D32',
    flex: 1,
  },
  reuploadText: {
    color: '#007BFF',
    fontWeight: '500',
    marginLeft: 12,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  }
});
