"use client"
import { Button } from '@/components/ui/button'
import React from 'react'
import { useRouter, useParams } from 'next/navigation'
function Failedpage() {
    const router = useRouter();
    const { id } = useParams();
  return (
    <section>
    <div>Yout payment failed Please try again</div>
    <Button onClick={() => router.replace("/payment/"+id+"")}>Try Again</Button>
    </section>

  )
}

export default Failedpage