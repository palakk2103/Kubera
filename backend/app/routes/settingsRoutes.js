import express from "express";
import multer from "multer";
import { getPublicSettings, updateSettings, uploadSettingsImage } from "../controller/settingsController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Prevent HTTP caching of settings
router.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});

// Public: anyone can read settings (frontend, admin pre-fill)
router.get("/", getPublicSettings);

// Admin only: update settings
router.put("/", verifyToken, allowRoles("admin", "superadmin", "assistant", "manager"), updateSettings);

// Admin only: upload logo or favicon (multipart/form-data, field "image")
router.post("/upload", verifyToken, allowRoles("admin", "superadmin", "assistant", "manager"), upload.single("image"), uploadSettingsImage);

export default router;
