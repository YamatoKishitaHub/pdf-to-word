import Head from "next/head";
import { getCookie, setCookie } from "cookies-next";
import { v4 as uuidv4 } from "uuid";
import { Toaster } from "react-hot-toast";

import Header from "@/components/Header";
import FileDropZone from "@/components/FileDropZone";
import FileList from "@/components/FileList";

export default function Home() {
  if (!getCookie("uuid")) {
    setCookie("uuid", uuidv4());
  }

  return (
    <>
      <Head>
        <title>PDF→Word変換</title>
      </Head>
      <Toaster />
      <Header />
      <div className="flex flex-col gap-4 px-2">
        <div className="container mx-auto text-xl">
          <p>
            このサイトでは、PDFファイルをWordファイルに変換することができます。
          </p>
          <p>
            サーバーにアップロードされたファイルは、1日で自動的に削除されます。また、ユーザーが削除することもでき、安全に利用可能です。
          </p>
        </div>
        <FileDropZone />
        <FileList />
      </div>
    </>
  );
};
