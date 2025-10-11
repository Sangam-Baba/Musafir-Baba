import React from "react";
import Image from "next/image";
import logo from "../../../public/logo.svg";
import {
  MapPin,
  Phone,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  LucideTwitter,
  Mail,
} from "lucide-react";
import Newslatter from "./Newslatter";
import FooterItem from "../custom/FooterItem";
import LowerFooterItem from "../custom/LowerFooter";
import Link from "next/link";
function Footer() {
  return (
    <div className="">
      <Newslatter />
      <div className="flex flex-col md:flex-row gap-6 mb-8 py-15 px-4 md:px-10 lg:px-25  items-center md:items-start justify-between ">
        <div className="md:w-1/4 flex flex-col gap-2 ">
          <FooterItem title="Services" />
        </div>
        <div className="md:w-1/4 flex flex-col gap-2">
          <FooterItem title="Domestic Trips " />
          <FooterItem title="International Trips" />
        </div>
        <div className="md:w-1/4 flex flex-col gap-2">
          <FooterItem title="About Us" />
        </div>
        <div className="md:w-1/4 space-y-4">
          <Image src={logo} alt="logo" />
          <div className="flex flex-col py-2 gap-4">
            <div className="flex">
              <MapPin size={40} color="#FE5300" className="w-[10%] h-6  " />
              <p className="flex justify-start w-[90%]">
                1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main
                Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi,
                110043
              </p>
            </div>
            <div className="flex gap-2">
              <Phone size={40} color="#FE5300" className="w-[10%] h-6  " />
              <p className="flex justify-start w-[90%]">
                Tour: +91 92896 02447 | Visa: +91 93556 63591
              </p>
            </div>
            <div className="flex gap-2">
              <Mail size={40} color="#FE5300" className="w-[10%] h-6  " />
              <p className="flex justify-start w-[90%]">care@musafirbaba.com</p>
            </div>
            <div className="h-[200px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.624108549693!2d76.97522459999999!3d28.611051399999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d05a3e076b787%3A0xc858632593d54601!2sMusafirBaba%20-%20Best%20Travel%20Agency%20in%20Delhi%20I%20Holidays%20I%20Visa!5e0!3m2!1sen!2sin!4v1760166725887!5m2!1sen!2sin"
                width="100%"
                height="200"
                style={{ border: "0" }}
              ></iframe>
              {/* <Map address="1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043" /> */}
            </div>

            <div className="flex gap-4 item-center space-y-4">
              <p className="text-md font-bold">Follow Us:</p>
              <Link href="https://www.youtube.com/@hello_musafirbaba">
                {" "}
                <Youtube color="#FE5300" className="w-5 h-5 " />{" "}
              </Link>
              <Link href="http://facebook.com/hellomusafirbaba">
                {" "}
                <Facebook
                  color="#FE5300"
                  fill="white"
                  className="w-5 h-5"
                />{" "}
              </Link>
              <Link href="https://x.com/Musafircare">
                {" "}
                <LucideTwitter
                  color="#FE5300"
                  fill="white"
                  className="w-5 h-5"
                />{" "}
              </Link>
              <Link href="https://www.instagram.com/hello_musafirbaba">
                <Instagram color="#FE5300" className="w-5 h-5" />{" "}
              </Link>
              <Link href="https://in.linkedin.com/company/musafirbaba">
                <Linkedin color="#FE5300" fill="white" className="w-5 h-5" />{" "}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 mb-8 py-15 px-4 md:px-10 lg:px-25  items-center md:items-start justify-between">
        <div className="flex flex-col gap-2 pb-4">
          <p className="text-2xl font-bold">Quick Links</p>
          <p className="h-1 w-[5%] bg-[#FE5300]"></p>
        </div>
        <div>
          <LowerFooterItem />
        </div>
      </div>
      <div className="text-center py-4 border-t border-gray-200 px-4">
        <p>
          Copyright © 2020 - 2025 | Musafirbaba Travels Pvt. Ltd. | All Rights
          Reserved.
        </p>
      </div>
    </div>
  );
}

export default Footer;
