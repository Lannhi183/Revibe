import mongoose from 'mongoose';
export const { Schema, model } = mongoose;
export const baseOpts = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false };

