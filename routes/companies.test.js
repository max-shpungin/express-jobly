"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u1AdminToken
} = require("./_testCommon");
const { BadRequestError } = require("../expressError");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("ok for admin users", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });
// FIXME: previously: "BAD request" vs Unauth
  test("unauth for non-admins", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  //FIXME: bad request with missing data -- FOR ADMIN (need unauth for anon + for user)
  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  //FIXME: bad request with missing data -- FOR ADMIN (need unauth for anon + for user)

  test("bad request with invalid data for admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img",
          },
          {
            handle: "c3",
            name: "C3",
            description: "Desc3",
            numEmployees: 3,
            logoUrl: "http://c3.img",
          },
        ],
    });
  });

  test("GET /companies includes filters as anon", async function () {
    const resp = await request(app)
      .get(`/companies`)
      .query({ nameLike: "c", minEmployees: 1, maxEmployees: 2});

    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img",
          },
        ],
    });
  });

  test("Throws error if schema is not valid (minEmployees", async function(){
    try{
      await request(app)
        .get('/companies')
        .query({ minEmployees: 0 });
    }catch(err){
      expect(err instanceof BadRequestError).tobeTruthy();
    };
  });

  test("Throws error if schema is not valid (maxEmployees", async function(){
    try{
      await request(app)
        .get('/companies')
        .query({ maxEmployees: 0 });
    }catch(err){
      expect(err instanceof BadRequestError).tobeTruthy();
    };
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("works for logged-in (admin)", async function () {
    const resp = await request(app)
      .get(`/companies/c2`)
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    });
  });


  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
        numEmployees:1
      })
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for non-admin users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      });
    expect(resp.statusCode).toEqual(401);
  });

  //FIXME: bad request with missing data -- FOR ADMIN (need unauth for anon + for user)

  test("not found on no such company for admin", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  //FIXME: bad request with missing data -- FOR ADMIN (need unauth for anon + for user)

  test("bad request on handle change attempt for admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  //FIXME: bad request with missing data -- FOR ADMIN (need unauth for anon + for user)

  test("bad request on invalid data for admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for non-admin users", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  //FIXME: bad request with missing data -- FOR ADMIN (need unauth for anon + for user)

  test("not found for no such company for admin", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u1AdminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
