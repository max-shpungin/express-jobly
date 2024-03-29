"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError.js");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds
} = require("./_testCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "job1",
    salary: 10,
    equity: "0.01",
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);

    expect(job).toEqual({
      ...newJob,
      id: expect.any(Number)
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'job1'`);
    expect(result.rows).toEqual([
      {
        id: job.id,
        title: "job1",
        salary: 10,
        equity: "0.01", //FIXME: note the string
        company_handle: "c1"
      },
    ]);
  });

  test("bad request with non-existent company", async function () {
    try {
      await Job.create({
        title: "new",
        salary: 10,
        equity: "0.01",
        companyHandle: "WRONG"
      })
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
  // Note: We define jobs as a role that can be shared (Max and I are both
  // software-engineers at MaxInc getting paid the same etc...)
  // we are classified as Cjob = 1 and Mjob = 1 not Cjob = 1 Mjob = 2
  // Anyone can post the same post multiple times right now
});

/************************************** findJobs (get all jobs) */

describe("findAllJobs", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 10,
        equity: "0.1",
        companyHandle: "c1",
        id: testJobIds.testJobId1
      },
      {
        title: "j2",
        salary: 20,
        equity: "0.2",
        companyHandle: "c1",
        id: testJobIds.testJobId2
      },
      {
        title: "j3",
        salary: 30,
        equity: "0.3",
        companyHandle: "c1",
        id: testJobIds.testJobId3
      },
      {
        title: "j4",
        salary: 40,
        equity: '0',
        companyHandle: "c2",
        id: testJobIds.testJobId4
      },
    ]);
  });

  test("works: one filters", async function(){
    const filter = { minSalary: 20 };

    const response = await Job.findAll(filter);
    expect(response).toEqual([
      {
        title: "j2",
        salary: 20,
        equity: "0.2",
        companyHandle: "c1",
        id: testJobIds.testJobId2
      },
      {
        title: "j3",
        salary: 30,
        equity: "0.3",
        companyHandle: "c1",
        id: testJobIds.testJobId3
      },
      {
        title: "j4",
        salary: 40,
        equity: '0',
        companyHandle: "c2",
        id: testJobIds.testJobId4
      },
    ]);
  });



  test("works: two filters", async function(){
    const filter = { minSalary: 20, hasEquity: true };

    const response = await Job.findAll(filter);
    expect(response).toEqual([
      {
        title: "j2",
        salary: 20,
        equity: "0.2",
        companyHandle: "c1",
        id: testJobIds.testJobId2
      },
      {
        title: "j3",
        salary: 30,
        equity: "0.3",
        companyHandle: "c1",
        id: testJobIds.testJobId3
      },
    ]);
  });

  test("works: all filters", async function(){
    const filter = { title: "j4", minSalary: 20, hasEquity: false };

    const response = await Job.findAll(filter);
    expect(response).toEqual([
      {
        title: "j4",
        salary: 40,
        equity: '0',
        companyHandle: "c2",
        id: testJobIds.testJobId4
      },
    ]);
  });

  test("no results", async function(){
    const filter = { title: "job666"};
    const response = await Job.findAll(filter);
    expect(Object.keys(response).length).toEqual(0);

  })

  test("error: minSalary is negative", async function(){
    const filter = { minSalary: -20 };

    try{
      await Job.findAll(filter);
    }catch(err){

      expect(err instanceof BadRequestError);
    }
  })

  test("non-existent filters", async function(){
    const filter = { LeastFavCactus: 'garfield' };

    const response = await Job.findAll(filter);
    expect(response).toEqual([
      {
        title: "j1",
        salary: 10,
        equity: "0.1",
        companyHandle: "c1",
        id: testJobIds.testJobId1
      },
      {
        title: "j2",
        salary: 20,
        equity: "0.2",
        companyHandle: "c1",
        id: testJobIds.testJobId2
      },
      {
        title: "j3",
        salary: 30,
        equity: "0.3",
        companyHandle: "c1",
        id: testJobIds.testJobId3
      },
      {
        title: "j4",
        salary: 40,
        equity: '0',
        companyHandle: "c2",
        id: testJobIds.testJobId4
      },
    ]);

  })

}); /** END DESCRIBE BLOCK */






/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(testJobIds.testJobId1);
    expect(job).toEqual(
      {
        id: testJobIds.testJobId1,
        title: "j1",
        salary: 10,
        equity: "0.1",
        companyHandle: "c1"
      }
    );
  });


  test("bad request if invalid input", async function () {
    try {
      await Job.get("nope");
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {

      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(141414);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {

      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
      title: "new job1",
      salary: 500,
      equity: "0.5"
  };
  const badUpdateData = {
    title: "new job1",
    salary: 500,
    equity: "0.5",
    companyHandle: "c2"
};


  test("works", async function () {
    //debugger;
    let job = await Job.update(testJobIds.testJobId1, updateData);
    expect(job).toEqual({
      ...updateData,
      companyHandle: "c1",
      id: testJobIds.testJobId1
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${testJobIds.testJobId1}`);
    expect(result.rows).toEqual([{
      title: "new job1",
      salary: 500,
      equity: "0.5",
      company_handle: "c1",
      id: testJobIds.testJobId1
    }]);
  });


  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "new job1",
      salary: null,
      equity: null,
    };

    let job= await Job.update(testJobIds.testJobId1, updateDataSetNulls);
    expect(job).toEqual({
      ...updateDataSetNulls,
      id: testJobIds.testJobId1,
      companyHandle: "c1"
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${testJobIds.testJobId1}`);
    expect(result.rows).toEqual([{
      title: "new job1",
      salary: null,
      equity: null,
      company_handle: "c1",
      id: testJobIds.testJobId1
    }]);
  });

  test("fails if attempted to update company handle", async function () {
    try{
      await Job.update(testJobIds.testJobId1, badUpdateData);
      throw new Error("fail test, you shouldn't get here");
    }catch(err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(999999999, updateData);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(testJobIds.testJobId1, {});
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {

      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  //TODO: Test for data columns that don't exist?

});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(testJobIds.testJobId1);
    const res = await db.query(
        `SELECT id FROM jobs WHERE id=${testJobIds.testJobId1}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(9999999);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
