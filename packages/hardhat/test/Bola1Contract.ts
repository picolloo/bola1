import { expect } from "chai";
import { ethers } from "hardhat";
import { Bola1 } from "../typechain-types";

describe("bola1", function () {
  let bola1Contract: Bola1;

  beforeEach(async () => {
    const [owner] = await ethers.getSigners();
    const bola1Factory = await ethers.getContractFactory("Bola1");
    bola1Contract = (await bola1Factory.deploy(owner.address)) as Bola1;
    await bola1Contract.deployed();
  });

  describe("Entrance Fee", function () {
    it("Should have the right entranceFee", async function () {
      expect(await bola1Contract._entranceFee()).to.equal(0);
    });

    it("Should update the entranceFee", async function () {
      await bola1Contract.setEntranceFee(ethers.utils.parseEther("2"));
      expect(await bola1Contract._entranceFee()).to.equal(ethers.utils.parseEther("2"));
    });
  });

  describe("Participants", function () {
    it("Should block adding participants with no name", async function () {
      const [, addr] = await ethers.getSigners();
      await expect(bola1Contract.addParticipant(addr.address, "")).to.be.revertedWith("Name is required");
    });

    it("Should allow adding participants", async function () {
      const [, addr] = await ethers.getSigners();
      const name = "Bituca";

      await bola1Contract.addParticipant(addr.address, name);
      const participantData = await bola1Contract._participants(addr.address);
      expect(participantData.name).to.equal(name);
      expect(participantData.numberOfVotes).to.equal(ethers.BigNumber.from(0));
    });
  });

  describe("Voting", function () {
    it("Should block voting with no entrance fee", async function () {
      const [, addr] = await ethers.getSigners();
      await bola1Contract.setEntranceFee(ethers.utils.parseEther("2"));
      await expect(bola1Contract.addVote(addr.address)).to.be.revertedWith("Insufficient entrance fee");
    });

    it("Should block voting on invalid participant", async function () {
      const [, addr] = await ethers.getSigners();
      await bola1Contract.setEntranceFee(ethers.utils.parseEther("2"));

      await expect(bola1Contract.addVote(addr.address, { value: ethers.utils.parseEther("2") })).to.be.revertedWith(
        "Participant not found",
      );
    });

    it("Should allow voting on existing participant", async function () {
      const [, addr] = await ethers.getSigners();
      const name = "Bituca";
      await bola1Contract.addParticipant(addr.address, name);
      await bola1Contract.addVote(addr.address, { value: ethers.utils.parseEther("2") });

      const participantData = await bola1Contract._participants(addr.address);
      expect(participantData.name).to.equal(name);
      expect(participantData.numberOfVotes).to.equal(ethers.BigNumber.from(1));
    });

    it("Should block duplicated vote", async function () {
      const [, addr] = await ethers.getSigners();
      const name = "Richard";
      await bola1Contract.addParticipant(addr.address, name);
      await bola1Contract.addVote(addr.address, { value: ethers.utils.parseEther("2") });

      await expect(bola1Contract.addVote(addr.address, { value: ethers.utils.parseEther("2") })).to.be.revertedWith(
        "Duplicated vote",
      );

      const participantData = await bola1Contract._participants(addr.address);
      expect(participantData.name).to.equal(name);
      expect(participantData.numberOfVotes).to.equal(ethers.BigNumber.from(1));
    });
  });

  describe("End of bola1", function () {
    it("Should block end of bola1 with invalid winner", async function () {
      const [, addr] = await ethers.getSigners();
      await expect(bola1Contract.endOfBola1(addr.address)).to.be.revertedWith("Participant not found");
    });

    it("Should send the entire prize to a single voter", async function () {
      const [owner, addrBituca] = await ethers.getSigners();
      await bola1Contract.setEntranceFee(ethers.utils.parseEther("2"));

      await bola1Contract.addParticipant(addrBituca.address, "Bituca");

      await bola1Contract.addVote(addrBituca.address, { value: ethers.utils.parseEther("2") });
      await bola1Contract.endOfBola1(addrBituca.address);

      const prize = await bola1Contract._balances(owner.address);
      expect(prize).to.be.eq(ethers.utils.parseEther("2"));
    });

    it("Should split prize between voters", async function () {
      const [owner, addrBituca] = await ethers.getSigners();
      await bola1Contract.setEntranceFee(ethers.utils.parseEther("2"));
      await bola1Contract.addParticipant(addrBituca.address, "Bituca");

      await bola1Contract.addVote(addrBituca.address, { value: ethers.utils.parseEther("2") });
      await addrBituca.sendTransaction({
        to: bola1Contract.address,
        value: ethers.utils.parseEther("2"),
        data: bola1Contract.interface.encodeFunctionData("addVote", [addrBituca.address]),
      });

      const bituca = await bola1Contract._participants(addrBituca.address);
      expect(bituca.numberOfVotes).to.be.eq(2);

      await bola1Contract.endOfBola1(addrBituca.address);

      const ownerPrize = await bola1Contract._balances(owner.address);
      expect(ownerPrize).to.be.eq(ethers.utils.parseEther("2"));

      const bitucaPrize = await bola1Contract._balances(addrBituca.address);
      expect(bitucaPrize).to.be.eq(ethers.utils.parseEther("2"));
    });
  });
});
