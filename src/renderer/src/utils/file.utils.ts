export const getJSONFromFile = (file: File) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(JSON.parse(reader.result as string));
    };
    reader.readAsText(file);
  });
};

export const getJSONFromFiles = (files: FileList) => {
  const allPromises = [...files].map((file) => {
    return getJSONFromFile(file);
  });

  return Promise.all(allPromises);
};
