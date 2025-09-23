"use client"
import {useState} from 'react'
interface LikesProps {
    id: string,
    initialLikes: number
}
function BlogLikes({id, initialLikes}: LikesProps) {
    const [likes, setLikes] = useState(initialLikes);
    const [liked, setLiked] = useState(false);

 const handleLike= async ()=>{
  try {
    setLiked(true);
    setLikes((prevLikes) => prevLikes + 1);
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/like/${id}`, {
      method: "PATCH",
    });
    const data = await response.json();
    if (data.success) {
      setLikes(data.data.likes);
    } else {
      console.error(data.message);
    }
  } catch (error) {
    console.error("Error liking blog:", error);
  }
 }
  return (
    <button onClick={handleLike} className="flex items-center gap-1 text-sm" disabled={liked}>
      ❤️ {likes + 50}
    </button>
  )
}

export default BlogLikes