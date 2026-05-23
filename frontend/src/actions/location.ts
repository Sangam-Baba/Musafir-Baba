"use server";

import { State, City } from "country-state-city";

export async function getStates(countryIso: string) {
  return State.getStatesOfCountry(countryIso).map(s => ({
    name: s.name,
    isoCode: s.isoCode
  }));
}

export async function getCities(countryIso: string, stateIso: string) {
  return City.getCitiesOfState(countryIso, stateIso).map(c => ({
    name: c.name
  }));
}
