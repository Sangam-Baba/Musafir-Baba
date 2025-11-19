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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
function Footer() {
  return (
    <div className="mt-12 md:mt-20">
      <Newslatter />
      {/* Desktop Footer */}
      <div className="hidden md:flex md:flex-row  gap-6  py-15 px-4 md:px-10 lg:px-25 items-center md:items-start justify-between ">
        <div className="md:w-[30%] flex flex-col gap-2 ">
          <Image src={logo} alt="logo" />
          <p>
            {" "}
            MusafirBaba, a trusted name in the tour and travel industry in
            Delhi. We offer expertly crafted customised tour packages, group
            bike tours, international trips, family vacations, weekend getaways,
            honeymoon packages and corporate trips along with visa assistance
            and bus/train/flight bookings etc.
          </p>

          {/* SOcial */}

          <div className="flex flex-col gap-2 mt-4">
            <p className="text-lg font-bold">Follow Us</p>
            <p className="w-[5%] h-0.5 bg-[#FE5300]"></p>
            <div className="flex items-center  gap-4 pt-2">
              <Link href="https://www.youtube.com/@hello_musafirbaba">
                <Youtube
                  color="#FE5300"
                  className="w-6 h-6 hover:scale-110 transition-transform"
                />
              </Link>
              <Link href="http://facebook.com/hellomusafirbaba">
                <Facebook
                  color="#FE5300"
                  className="w-6 h-6 hover:scale-110 transition-transform"
                />
              </Link>
              <Link href="https://x.com/itsmusafirbaba">
                <LucideTwitter
                  color="#FE5300"
                  className="w-6 h-6 hover:scale-110 transition-transform"
                />
              </Link>
              <Link href="https://www.instagram.com/hello_musafirbaba">
                <Instagram
                  color="#FE5300"
                  className="w-6 h-6 hover:scale-110 transition-transform"
                />
              </Link>
              <Link href="https://in.linkedin.com/company/musafirbaba">
                <Linkedin
                  color="#FE5300"
                  className="w-6 h-6 hover:scale-110 transition-transform"
                />
              </Link>
            </div>
          </div>
        </div>
        {/*     Services */}
        <div className="md:w-[20%] flex flex-col gap-2">
          <FooterItem title="Services" />
        </div>
        {/* About us */}
        <div className="md:w-[20%] flex flex-col gap-2">
          <FooterItem title="About Us" />
        </div>
        {/* contact us */}
        <div className="md:w-[30%] space-y-4">
          <div>
            <p className="text-lg font-bold">Contact Us</p>
            <p className="w-[5%] h-0.5 bg-[#FE5300]"></p>
          </div>

          <div className="flex flex-col py-2 gap-4">
            <div className="flex gap-1 ">
              <MapPin size={20} color="#FE5300" className="w-[5%] h-5 mt-1 " />
              <p className="flex justify-start w-[90%]">
                1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main
                Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi,
                110043
              </p>
            </div>
            <div className="flex gap-1 items-center">
              <Phone size={20} color="#FE5300" className="w-[5%] h-5  " />
              <div className="md:flex justify-start w-[90%] gap-2">
                <p>
                  <span className="font-bold">Tour:</span>+91 92896 02447
                </p>
              </div>
            </div>
            <div className="flex gap-1 items-center">
              <Phone size={20} color="#FE5300" className="w-[5%] h-5  " />
              <div className="md:flex justify-start w-[90%] gap-2">
                <p>
                  <span className="font-bold">Visa:</span>+91 93556 63591
                </p>
              </div>
            </div>
            <div className="flex gap-1 items-center">
              <Mail size={20} color="#FE5300" className="w-[5%] h-5  " />
              <p className="flex justify-start w-[90%]">care@musafirbaba.com</p>
            </div>
            <div className="h-[200px] rounded-xl overflow-hidden mt-3">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.624108549693!2d76.97522459999999!3d28.611051399999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d05a3e076b787%3A0xc858632593d54601!2sMusafirBaba%20-%20Best%20Travel%20Agency%20in%20Delhi%20I%20Holidays%20I%20Visa!5e0!3m2!1sen!2sin!4v1760166725887!5m2!1sen!2sin"
                width="100%"
                height="200"
                style={{ border: "0" }}
              ></iframe>
            </div>
            {/* Socials */}
          </div>
        </div>
      </div>
      {/* Mobile Footer */}
      <div className="md:hidden flex flex-col gap-4  px-4 py-8">
        <Accordion type="single" collapsible className="w-full space-y-4">
          {/* === Services === */}
          <AccordionItem
            value="services"
            className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-200"
          >
            <AccordionTrigger className="flex justify-between items-center px-5 py-3 text-lg font-semibold text-gray-800 hover:text-[#FE5300] transition-all">
              <span>Overview</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 text-gray-700 text-sm flex flex-col gap-3 animate-fadeIn">
              <Image
                src={logo}
                alt="Musafir Baba Logo"
                className="w-40 mx-auto"
              />
              <p>
                MusafirBaba, a trusted name in the tour and travel industry in
                Delhi. We offer expertly crafted customised tour packages, group
                bike tours, international trips, family vacations, weekend
                getaways, honeymoon packages and corporate trips along with visa
                assistance and bus/train/flight bookings etc.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* === Services === */}
          <AccordionItem
            value="trips"
            className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-200"
          >
            <AccordionTrigger className="flex justify-between items-center px-5 py-3 text-lg font-semibold text-gray-800 hover:text-[#FE5300] transition-all">
              <span>Services</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 text-gray-700 text-sm flex flex-col gap-3 animate-fadeIn">
              <FooterItem title="Services" />
            </AccordionContent>
          </AccordionItem>

          {/* === About Us === */}
          <AccordionItem
            value="about"
            className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-200"
          >
            <AccordionTrigger className="flex justify-between items-center px-5 py-3 text-lg font-semibold text-gray-800 hover:text-[#FE5300] transition-all">
              <span>About Us</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 text-gray-700 text-sm flex flex-col gap-3 animate-fadeIn">
              <FooterItem title="About Us" />
            </AccordionContent>
          </AccordionItem>

          {/* === Connect === */}
          <AccordionItem
            value="connect"
            className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-200"
          >
            <AccordionTrigger className="flex justify-between items-center px-5 py-3 text-lg font-semibold text-gray-800 hover:text-[#FE5300] transition-all">
              <span>Contact Us</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 text-gray-700 text-sm flex flex-col gap-4 animate-fadeIn">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin color="#FE5300" className="mt-1 shrink-0" />
                  <p className="text-sm">
                    1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near
                    Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi,
                    Delhi, 110043
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Phone color="#FE5300" className="mt-1 shrink-0" />
                  <p className="text-sm">
                    Tour: +91 92896 02447 | Visa: +91 93556 63591
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Mail color="#FE5300" className="mt-1 shrink-0" />
                  <p className="text-sm">care@musafirbaba.com</p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden mt-3">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.624108549693!2d76.97522459999999!3d28.611051399999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d05a3e076b787%3A0xc858632593d54601!2sMusafirBaba%20-%20Best%20Travel%20Agency%20in%20Delhi%20I%20Holidays%20I%20Visa!5e0!3m2!1sen!2sin!4v1760166725887!5m2!1sen!2sin"
                  width="100%"
                  height="180"
                  style={{ border: "0" }}
                  loading="lazy"
                ></iframe>
              </div>

              {/* Socials */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <Link href="https://www.youtube.com/@hello_musafirbaba">
                  <Youtube
                    color="#FE5300"
                    className="w-6 h-6 hover:scale-110 transition-transform"
                  />
                </Link>
                <Link href="http://facebook.com/hellomusafirbaba">
                  <Facebook
                    color="#FE5300"
                    className="w-6 h-6 hover:scale-110 transition-transform"
                  />
                </Link>
                <Link href="https://x.com/itsmusafirbaba">
                  <LucideTwitter
                    color="#FE5300"
                    className="w-6 h-6 hover:scale-110 transition-transform"
                  />
                </Link>
                <Link href="https://www.instagram.com/hello_musafirbaba">
                  <Instagram
                    color="#FE5300"
                    className="w-6 h-6 hover:scale-110 transition-transform"
                  />
                </Link>
                <Link href="https://in.linkedin.com/company/musafirbaba">
                  <Linkedin
                    color="#FE5300"
                    className="w-6 h-6 hover:scale-110 transition-transform"
                  />
                </Link>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="Quick Links"
            className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-200"
          >
            <AccordionTrigger className="flex justify-between items-center px-5 py-3 text-lg font-semibold text-gray-800 hover:text-[#FE5300] transition-all">
              <span>Quick Links</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 text-gray-700 text-sm flex flex-col gap-3 animate-fadeIn">
              <div>
                <LowerFooterItem />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      {/* <div className="h-0.5 w-[100%] bg-gray-200 "></div> */}
      {/* Quick Links */}
      <div className="hidden md:flex border-t border-gray-200 md:py-12 py-8  px-4 md:px-10 lg:px-25  items-center md:items-start justify-between">
        <div className="flex flex-col gap-2 pb-4">
          <p className="text-2xl font-bold">Quick Links</p>
          <p className="h-1 w-[5%] bg-[#FE5300]"></p>
        </div>
        <div>
          <LowerFooterItem />
        </div>
      </div>
      {/* <div className="md:hidden flex flex-col gap-4  px-4 py-8">
        <Accordion
          type="single"
          collapsible
          className="w-full space-y-4"
        ></Accordion>
      </div> */}
      {/* LowerFooter */}
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
