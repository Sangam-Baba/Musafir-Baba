import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {  CircleUserRound  } from "lucide-react"
import Link from 'next/link'
import { useAuthStore } from "@/store/useAuthStore"
export function AccountIcon() {
  const auth = useAuthStore();
  const isAuthenticated = auth.isAuthenticated;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"><CircleUserRound /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          { !isAuthenticated &&
          <DropdownMenuItem>
            <Link href="/auth/register">Register</Link>  
          </DropdownMenuItem> }
         { !isAuthenticated && <DropdownMenuItem>
            <Link href="/auth/login">Login</Link> 
          </DropdownMenuItem>  }
         {isAuthenticated && <DropdownMenuItem><Link href="/auth/profile">Profile</Link> </DropdownMenuItem>} 
         {isAuthenticated && <DropdownMenuItem><Link href="/auth/bookings">My Bookings</Link> </DropdownMenuItem>} 
          {isAuthenticated && <DropdownMenuItem><Link href="/auth/logout">Logout</Link> </DropdownMenuItem>} 
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
