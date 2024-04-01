const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
const multer = require("multer");
const path = require("path");
const { PythonShell } = require("python-shell");
const fs = require("fs");
const cron = require("node-cron");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// PDFからWordファイルに変換し、SupabaseのStorageにWordファイルをアップロード
router.post("/pdf_to_docx", upload.single("pdf"), (req, res, err) => {
  // if (err) {
  //   console.error(err);
  //   res.status(500).send("An error occurred");
  //   return;
  // }

  try {
    const pyshell = new PythonShell("pdf_to_docx.py", {
      mode: "text",
      pythonPath: "python",
      scriptPath: __dirname, // path.join(process.cwd(), "/routers")でもOK
      args: [req.file.path],
    });

    pyshell.on("message", (message) => {
      console.log(message);
    });

    pyshell.on("error", (message) => {
      console.error(message);
      res.status(500).send("An error occurred");
    });

    pyshell.end(async (err) => {
      // if (err) {
      //   res.send(err);
      //   return;
      // }

      const docxFilePath = req.file.path.replace(".pdf", ".docx");
      const docxFileData = fs.readFileSync(docxFilePath);

      // SupabaseのStorageにWordファイルをアップロード
      const { data, error } = await supabase.storage.from("file").upload(req.cookies.uuid + "/" + req.file.filename.replace(".pdf", ".docx"), docxFileData);

      // uploadsディレクトリから、PDF、Wordを削除
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(docxFilePath);

      return res.json(data);

      // いきなりダウンロードしたい場合
      // res.download(docxFilePath, req.file.path.replace(".pdf", ".docx"), (err) => {
      //   if (err) {
      //     console.error(err);
      //     res.status(500).send("An error occurred");
      //   }
      // });
    });
  } catch (error) {
    console.error("An error occurred: ", error);
    res.status(500).send("An error occurred");
  }
});

// SupabaseのFileテーブルにデータを保存
router.post("/post_file", async (req, res) => {
  const { originalName, fileName } = req.body;

  const file = await prisma.file.create({
    data: {
      userId: req.cookies.uuid,
      originalName,
      fileName,
      expiresAt: new Date(new Date().getTime() + (1000 * 60 * 60 * 24)),
    },
  });

  req.io.emit("newFileAdded", "newFileAdded");

  return res.json(file);
});

// SupabaseのFileテーブルのデータを取得
router.get("/get_all_files", async (req, res) => {
  const files = await prisma.file.findMany({
    where: {
      userId: req.cookies.uuid,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.json(files);
});

// SupabaseのFileテーブル、Storageからデータを削除
router.delete("/delete_file", async (req, res) => {
  const { id, fileName } = req.body;

  await prisma.file.delete({
    where: {
      id,
      fileName,
    },
  });

  // SupabaseのStorageからWordファイルを削除
  const { data, error } = await supabase.storage.from("file").remove([fileName]);

  req.io.emit("fileDeleted", "fileDeleted");

  return res.json(data);
});

// node-cronでファイルを取得してきて、created_atから1日以上経過していた場合削除
cron.schedule("0 * * * * *", async () => {
  console.log("running a task every minute");
  const { data: folders, error } = await supabase.storage.from("file").list();

  for (let i = 0; i < folders.length - 1; i++) {  // foldersには、 { name: '.emptyFolderPlaceholder', ... } という余分なデータが含まれているのでfolders.lengthから-1
    const { data: files, error } = await supabase.storage.from("file").list(folders[i].name);

    for (let j = 0; j < files.length; j++) {
      // ファイル作成から1日以上経過していたら、削除
      if (new Date() - new Date(files[j].created_at) > 1000 * 60 * 60 * 24) {
        const id = await prisma.file.findFirst({
          where: {
            fileName: files[j].name,
          },
        });
        const responseTest = await prisma.file.delete({
          where: {
            id: id.id,
            fileName: files[j].name,
          },
        });

        const { data, error } = await supabase.storage.from("file").remove([folders[i].name + "/" + files[j].name]);
      }
    }
  }
});

module.exports = router;
