export class BasicFileReader {
  static readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  static readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target?.result as ArrayBuffer);
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  static readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  static async getFileSize(file: File): Promise<number> {
    return file.size;
  }

  static async validateFileType(file: File, allowedTypes: string[]): Promise<boolean> {
    return allowedTypes.some(type => file.type.includes(type) || file.name.endsWith(type));
  }
}
