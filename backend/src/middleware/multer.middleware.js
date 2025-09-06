import multer from "multer";

const storage= multer.memoryStorage();

const fileFilter=(req, file ,cb)=>{
    if(file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")){
        cb(null, true);
    } else {
        cb(new Error("Only image and video files are allowed!"), false);
    }
};

const upload= multer({
    storage,
    fileFilter,
    limits:{ fileSize: 20*1024*1024},
});

export default upload;