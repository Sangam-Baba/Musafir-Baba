"use client"
import { useEffect } from "react"

declare global {
  interface Window {
    cloudinary: {
      createMediaLibrary: (
        options: Record<string, unknown>,
        callbacks: {
          insertHandler: (data: { assets: { secure_url: string; public_id: string }[] }) => void;
        }
      ) => {
        show: () => void;
      };
    };
  }
}


type Props = {
  onSelect: (image: { url: string; public_id: string }) => void
}

export default function CloudinaryMediaLibrary({ onSelect }: Props) {
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://media-library.cloudinary.com/global/all.js"
    script.async = true
    document.body.appendChild(script)
  }, [])

  const openWidget = () => {
    if (window.cloudinary) {
      const mediaLibrary = window.cloudinary.createMediaLibrary(
        {
          cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
          // username: "your-cloudinary-username",
          insert_caption: "Use Selected",
          multiple: false,
        },
        {
insertHandler: (data: { assets: { secure_url: string; public_id: string }[] }) => {
  const asset = data.assets[0];
  onSelect({
    url: asset.secure_url,
    public_id: asset.public_id,
  });
}

        }
      )
      mediaLibrary.show()
    }
  }

  return (
    <button
      type="button"
      onClick={openWidget}
      className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200"
    >
      Choose from Media Library
    </button>
  )
}
