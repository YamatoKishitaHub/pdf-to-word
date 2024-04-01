import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { PropagateLoader } from "react-spinners";
import toast from "react-hot-toast";

import axiosInstance from "@/lib/axiosInstance";

const FileDropZone = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(async (file: any) => {
      const formData = new FormData();
      formData.append("pdf", file);

      try {
        setLoading(true)

        // PDFをWordファイルに変換し、SupabaseのStorageにアップロード
        const uploadResponse = await axiosInstance.post("/file/pdf_to_docx", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          // いきなりダウンロードしたい場合
          // responseType: "blob",
          withCredentials: true,
        });

        // いきなりダウンロードしたい場合
        // const downloadUrl = window.URL.createObjectURL(new Blob([uploadResponse.data]));
        // const link = document.createElement("a");
        // link.innerHTML = "ダウンロード";
        // link.href = downloadUrl;
        // link.setAttribute("download", file.path.replace(".pdf", ".docx"));
        // document.body.appendChild(link);
        // link.click();

        if (uploadResponse) {
          // SupabaseのFileテーブルにデータを保存
          await axiosInstance.post("/file/post_file", {
              originalName: file.name,
              fileName: uploadResponse.data.path.split("/")[1],
            }, {
            withCredentials: true,
          });
        }
      } catch (error) {
        console.log(error);
        toast.error("エラーが発生しました。");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const {
    getRootProps,
    getInputProps,
    open,
    acceptedFiles,
  } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [],
    },
    maxFiles: 3,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <>
      <div className="container mx-auto text-xl">
        <h1 className="text-center text-3xl">
          PDFをWordに変換
        </h1>
        <div {...getRootProps()} className="p-4 text-center border-2 border-dashed bg-gray-100">
          <input {...getInputProps()} type="file" name="pdf" accept=".pdf"/>
          <button type="button" onClick={open} className="p-4 mb-2 text-white rounded-xl bg-blue-500">
            PDFファイルを選択
          </button>
          <p>または、ここにPDFをドロップ</p>
          <p>同時に、最大3つのPDFファイルを変換できます。</p>
        </div>
      </div>
      {loading && (
        <div className="flex flex-col gap-8 container mx-auto text-center text-xl">
          <div>
            <PropagateLoader color="#36d7b7" />
          </div>
          <div>
            {acceptedFiles.map((file: File, index) => (
              <span key={file.name}>
                {file.name}{index !== acceptedFiles.length - 1 && ", "}
              </span>
            ))}
            を変換中
          </div>
        </div>
      )}
    </>
  );
};

export default FileDropZone;
