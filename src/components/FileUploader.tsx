import React, { useState } from 'react';

const FileUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Perform file conversion and loading here
    }
  };

  return (
    <div>
      <input type="file" accept=".GLTF,.GLB,.OBJ" onChange={handleFileChange} />
      {file && <p>Selected File: {file.name}</p>}
    </div>
  );
};

export default FileUploader;
