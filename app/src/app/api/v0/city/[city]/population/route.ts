import UserService from "@/backend/UserService";
import { db } from "@/models";
import { apiHandler } from "@/util/api";
import { createPopulationRequest } from "@/util/validation";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req, { session, params }) => {
  const body = createPopulationRequest.parse(await req.json());
  const city = await UserService.findUserCity(params.city, session);

  let population = await db.models.Population.findOne({
    where: {
      cityId: city.cityId,
      year: body.year,
    },
  });

  if (!population) {
    population = await db.models.Population.create({
      ...body,
      cityId: city.cityId,
    });
  }

  return NextResponse.json({ data: population });
});
