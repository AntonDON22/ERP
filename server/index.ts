import express, { type Request, Response, NextFunction } from "express";
import { registerVite } from "./vite";
import { createServer } from "vite";
import { db } from "./db";
import { productsTable } from "../shared/schema";
import apiRoutes from "./routes";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve attached assets
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));