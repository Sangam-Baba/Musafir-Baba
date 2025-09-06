"use client";

import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = "md", message }) => {
  const sizeClasses =
    size === "sm"
      ? "w-6 h-6 border-2"
      : size === "lg"
      ? "w-12 h-12 border-4"
      : "w-8 h-8 border-3";

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div
        className={`animate-spin rounded-full border-gray-300 border-t-primary ${sizeClasses}`}
      />
      {message && (
        <p className="mt-3 text-gray-600 text-sm font-medium">{message}</p>
      )}
    </div>
  );
};
