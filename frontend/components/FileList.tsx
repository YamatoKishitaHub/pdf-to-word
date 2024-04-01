import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

import axiosInstance from "@/lib/axiosInstance";

type FileType = {
  id: number;
  userId: string;
  originalName: string;
  fileName: string;
  createdAt: string;
  expiresAt: string;
};

const FileList = () => {
  const [files, setFiles] = useState<FileType[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const filesResponse = await axiosInstance.get("/file/get_all_files", {
          withCredentials: true,
        });
        setFiles(filesResponse.data);
      } catch (error) {
        console.log(error);
        toast.error("エラーが発生しました。");
      }
    };

    fetchFiles();

    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL as string, {
      withCredentials: true,
    });

    socket.on("connect", () => {
      // console.log(socket.id);
      console.log("socket connect")
    });

    socket.on("disconnect", () => {
      // console.log(socket.id);
      console.log("socket disconnect")
    });

    // 新しいファイルが追加されたとき
    socket.on("newFileAdded", () => {
      fetchFiles();
    });

    // ファイルを削除したとき
    socket.on("fileDeleted", () => {
      fetchFiles();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, file: FileType) => {
    if (!handleCheckExpires(file)) {
      window.location.href = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/file/" + file.userId + "/" + file.fileName;
    }
  };

  const handleDelete = async (file: FileType) => {
    if (!handleCheckExpires(file)) {
      try {
        await axiosInstance.delete("/file/delete_file", {
          data: {
            id: file.id,
            fileName: file.fileName,
          },
          withCredentials: true,
        });
      } catch (error) {
        console.log(error);
        toast.error("エラーが発生しました。");
      }
    }
  };

  const handleCheckExpires = (file: FileType) => {
    if (new Date().getTime() - new Date(file?.createdAt).getTime() > 1000 * 60 * 60 * 24) {
      toast.error("このファイルは有効期限が切れています。");
      return true;
    } else {
      return false;
    }
  };

  return (
    <>
      {files.length !== 0 && (
        <div>
          <h1 className="text-center text-3xl">
            あなたのWordファイル一覧
          </h1>
          <div className="container mx-auto text-xl border">
            {files.map((file: any) => (
              <div key={file.id} className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 border">
                <div>
                  {file.originalName.slice(0, -4) + ".docx"}
                </div>
                <div className="flex items-center gap-2 min-w-56">
                  <button type="button" className="p-2 text-white rounded-lg bg-blue-500">
                    {/* <a href={process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/file/" + file.userId + "/" + file.fileName} download={file.originalName.slice(0, -4) + ".docx"}> */}
                    <a onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => handleDownload(e, file)}>
                    {/* <a href={process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/file/" + file.userId + "/" + file.fileName} download={file.originalName.slice(0, -4) + ".docx"} onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => handleDownload(e, file)}> */}
                      ダウンロード
                    </a>
                  </button>
                  <button type="button" className="p-2 text-white rounded-lg bg-red-500" onClick={() => handleDelete(file)}>
                    削除<br />（
                    {new Date(file.expiresAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                    に自動削除）
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default FileList;
