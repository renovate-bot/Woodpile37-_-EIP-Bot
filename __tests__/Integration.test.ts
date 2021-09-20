// integration tests in this repo are previously fixed bugs
import { SavedRecord } from "assets/records";
import { envFactory } from "__tests__/factories/envFactory";
import * as core from "@actions/core";
import { __MAIN_MOCK__ } from "assets/mockPR";
import MockedEnv from "mocked-env";
import nock from "nock";
import { Mutable, PromiseValue } from "type-fest";

describe("integration testing edgecases associated with editors", () => {
  const setFailedMock = jest
    .fn()
    .mockImplementation(core.setFailed) as jest.MockedFunction<
    typeof core.setFailed
  >;
  const restore = MockedEnv(process.env);

  beforeEach(async () => {
    jest.resetModules();
    const core = await import("@actions/core");
    jest.spyOn(core, "setFailed").mockImplementation(setFailedMock);
    setFailedMock.mockClear();
    nock.cleanAll();
  });

  afterEach(() => {
    restore();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("Pull 3670", () => {
    it("should require editor approval if an editor is also an author", async () => {
      process.env = envFactory({ PULL_NUMBER: SavedRecord.PR3670 });
      await __MAIN_MOCK__();
      expect(setFailedMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Pull 3654", () => {
    it("should mention editors if there's a valid status error and no editor approval", async () => {
      process.env = envFactory({ PULL_NUMBER: SavedRecord.PR3654_2 });

      // to be used later to check for mentions (postComment was an arbitrary choice)
      jest.mock("#components", () => ({
        ...jest.requireActual("#components"),
        postComment: jest
          .fn()
          .mockImplementation(() => console.log("mocked call"))
      }));

      // constrain constants to prevent changes in state
      jest.mock("#domain", () => ({
        ...jest.requireActual("#domain"),
        EIP_EDITORS: ["@micahzoltu", "@lighclient"]
      }));
      jest.resetModules();

      await __MAIN_MOCK__();

      const Domain = await import("#domain");
      const Components = (await import("#components")) as jest.Mocked<
        PromiseValue<typeof import("#components")>
      >;

      // collect the call
      expect(Components.postComment).toHaveBeenCalledTimes(1);
      const call = Components.postComment.mock.calls[0];
      function assertDefined<T>(call: T): asserts call is NonNullable<T> {
        expect(call).toBeDefined();
      }
      assertDefined(call);

      expect(call[0]).toContain(Domain.EIP_EDITORS[0]);
      expect(call[0]).toContain(Domain.EIP_EDITORS[1]);
    });

    it("should pass with editor approval", async () => {
      process.env = envFactory({ PULL_NUMBER: SavedRecord.PR3654_1 });

      jest.mock("#domain", () => ({
        ...jest.requireActual("#domain"),
        EIP_EDITORS: ["@micahzoltu", "@lighclient"]
      }));

      // console.log(proxy.EIP_EDITORS)
      await __MAIN_MOCK__();

      expect(setFailedMock).not.toBeCalled();
    });
  });

  describe("Pull 3767", () => {
    it("should pass", async () => {
      process.env = envFactory({ PULL_NUMBER: SavedRecord.PR3767 });

      await __MAIN_MOCK__();
      expect(setFailedMock).not.toBeCalled();
    });
  });

  describe("Pull 3612", () => {
    it("should pass", async () => {
      process.env = envFactory({ PULL_NUMBER: SavedRecord.PR3612 });

      await __MAIN_MOCK__();
      expect(setFailedMock).not.toBeCalled();
    });
  });

  describe("Pull 4192", () => {
    it("should not pass either files", async () => {
      process.env = envFactory({ PULL_NUMBER: SavedRecord.PR4192 });

      await __MAIN_MOCK__();
      expect(setFailedMock).toBeCalled();
      const call = setFailedMock.mock.calls[0] as NonNullable<
        typeof setFailedMock.mock.calls[0]
      >;
      expect(call[0]).not.toMatch(/passed/);
    });

    it("should mention multiple expected files", async () => {
      process.env = envFactory({ PULL_NUMBER: SavedRecord.PR4192 });

      await __MAIN_MOCK__();
      expect(setFailedMock).toBeCalled();
      const call = setFailedMock.mock.calls[0] as NonNullable<
        typeof setFailedMock.mock.calls[0]
      >;
      expect(call[0]).toMatch(/eip-1010.md/);
      expect(call[0]).toMatch(/eip-1056.md/);
    });
  });
});
