import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import RentalsClient from "./RentalsClient";
import { Metadata } from "next";
import ReadMore from "@/components/common/ReadMore";

export const metadata: Metadata = {
  title: "Car & Bike Rentals - Affordable Self Drive & Chauffeur Rental Vehicles",
  description:
    "Rent cars and bikes easily for local travel, outstation trips, and holidays. Explore affordable vehicle rental options with flexible durations, verified vehicles, and convenient booking.",
  keywords:
    "car and bike rentals, car rental services, bike rental services, self drive car rental, rent a car for travel, rent bikes for trip, car rental for outstation, bike rental near me, vehicle rental services",
};

const getAllVehicles = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/all`);
  if (!res.ok) throw new Error("Failed to fetch Vehicles");
  const data = await res.json();
  return data?.data;
};

async function page() {
  const vehicles = await getAllVehicles();
  
  const content = `
<p>Travel plans often require flexibility, comfort, and independence. Whether you are exploring a city, planning a road trip, or simply need reliable transport during your journey, car and bike rentals offer the convenience of travelling at your own pace. The MusafirBaba Rentals page brings together a range of vehicles that travellers can choose from based on their travel needs, preferences, and budget.</p>

<p>This page lists available cars and bikes for rent, allowing travellers to explore vehicle options that suit different types of journeys. From short city rides to long-distance road trips, renting a vehicle provides freedom and convenience that traditional transportation options may not always offer.</p>

<h2>Why Vehicle Rentals Are Becoming Popular Among Travellers</h2>

<p>Modern travellers prefer flexibility when exploring destinations. Public transport schedules, limited taxi availability, or fixed tour itineraries may restrict travel plans. Renting a car or bike solves this problem by giving travellers control over their schedule and travel routes.</p>

<p>Vehicle rental services have become increasingly popular for several reasons:</p>

<ul>
  <li>Flexibility to travel anytime</li>
  <li>Convenient transportation during trips</li>
  <li>Freedom to explore offbeat destinations</li>
  <li>Comfortable travel for families and groups</li>
  <li>Budget-friendly alternatives for short trips</li>
</ul>

<p>With rental vehicles, travellers can design their journeys based on personal preferences rather than fixed transport schedules.</p>

<h2>Car Rentals for Comfortable Travel</h2>

<p>Car rentals are ideal for travellers looking for comfort, safety, and convenience. Whether travelling with family, friends, or colleagues, renting a car ensures a smooth journey without the stress of managing multiple transport connections.</p>

<p>Car rental services are suitable for many travel situations such as:</p>

<h3>Local City Travel</h3>

<p>Travelling within a city becomes much easier when you have a rental car available. It allows you to visit attractions, markets, restaurants, and landmarks without depending on taxis or public transport.</p>

<h3>Outstation Road Trips</h3>

<p>Many travellers prefer renting cars for weekend getaways and longer road trips. Having a personal vehicle allows you to explore scenic routes, stop at interesting locations, and travel at your own pace.</p>

<h3>Airport Transfers & Intercity Travel</h3>

<p>Car rentals are also useful for airport pickups, drop-offs, and intercity travel where comfort and punctuality matter.</p>

<h3>Family Holidays</h3>

<p>Families travelling with children or elderly members often prefer car rentals for a smoother and more comfortable journey.</p>

<h2>Bike Rentals for Adventure and Short Distance Travel</h2>

<p>Bike rentals are popular among travellers who enjoy exploring destinations with more flexibility and adventure. Riding a bike provides a unique way to experience cities, scenic landscapes, and local surroundings.</p>

<p>Bike rentals are especially suitable for:</p>

<h3>Exploring Tourist Destinations</h3>

<p>Bikes make it easy to move through crowded tourist areas where larger vehicles may face restrictions.</p>

<h3>Adventure & Road Trips</h3>

<p>Many travellers rent bikes for scenic road journeys through mountains, coastal roads, and countryside routes.</p>

<h3>Budget-Friendly Travel</h3>

<p>Bike rentals are often a more affordable transportation option for solo travellers and backpackers.</p>

<h3>Short Distance Convenience</h3>

<p>For short trips within cities or tourist areas, bikes provide a quick and efficient travel solution.</p>

<h2>Self Drive vs Chauffeur Driven Rentals</h2>

<p>Travellers usually choose between self-drive vehicles and chauffeur-driven rentals depending on their travel style.</p>

<h3>Self Drive Rentals</h3>

<p>Self-drive cars and bikes allow travellers to drive the vehicle themselves. This option is popular among travellers who want complete independence during their journey.</p>

<p>Benefits include:</p>

<ul>
  <li>Privacy during travel</li>
  <li>Flexible schedules</li>
  <li>Freedom to choose routes</li>
</ul>

<h3>Chauffeur Driven Rentals</h3>

<p>Some travellers prefer vehicles with professional drivers, especially when travelling in unfamiliar destinations.</p>

<p>Benefits include:</p>

<ul>
  <li>Stress-free travel</li>
  <li>No navigation concerns</li>
  <li>Comfortable long-distance journeys</li>
</ul>

<p>Both options offer unique advantages depending on the traveller's needs.</p>

<h2>Choosing the Right Rental Vehicle</h2>

<p>Selecting the right vehicle depends on several factors including trip duration, group size, destination, and travel preferences.</p>

<p>Travellers should consider the following aspects before choosing a rental vehicle:</p>

<h3>Travel Distance</h3>

<p>Long-distance trips may require comfortable cars, while short local journeys can be easily managed with bikes or compact vehicles.</p>

<h3>Number of Travellers</h3>

<p>Families and groups usually prefer larger vehicles, while solo travellers often choose bikes or small cars.</p>

<h3>Road Conditions</h3>

<p>Certain destinations may have terrain better suited for specific types of vehicles.</p>

<h3>Budget Considerations</h3>

<p>Rental costs vary depending on vehicle type, duration, and destination.</p>

<p>Choosing the right vehicle ensures a smoother and more enjoyable travel experience.</p>

<h2>Rental Vehicles for Different Travel Needs</h2>

<p>Travellers rent vehicles for various purposes, including:</p>

<ul>
  <li>Tourism and sightseeing</li>
  <li>Weekend road trips</li>
  <li>Business travel</li>
  <li>Airport transfers</li>
  <li>Group travel</li>
  <li>Adventure rides</li>
</ul>

<p>Having access to rental vehicles helps travellers adapt to different travel situations easily.</p>

<h2>Safe and Responsible Travel</h2>

<p>While renting a vehicle provides freedom, responsible driving and proper planning are essential. Travellers should always follow local traffic regulations, carry required identification, and ensure they understand rental terms and conditions before starting their journey.</p>

<p>Safety and responsible travel help create better experiences not only for travellers but also for the communities and destinations they visit.</p>

<h2>Explore Available Vehicles</h2>

<p>The vehicles listed on this page include various categories of cars and bikes that travellers can explore based on their needs. Each listing provides details such as vehicle type, availability, and rental options to help travellers make informed choices.</p>

<p>By comparing available vehicles and selecting the right option, travellers can enjoy greater flexibility, convenience, and comfort during their journeys.</p>
`;

  return (
    <div>
      <Hero 
        title="Car & Bike Rentals - Flexible Travel With Reliable Vehicle Options" 
        image="/rent.jpeg" 
      />

      <div className="max-w-7xl mx-auto">
        <Breadcrumb title="Rental Services" />
        <div className="mx-4 md:mx-6 lg:mx-8 mt-6">
          <ReadMore content={content} />
        </div>
      </div>

      <RentalsClient vehicles={vehicles} />
    </div>
  );
}

export default page;
