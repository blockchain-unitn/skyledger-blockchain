import { expect } from "chai";
import { ethers } from "hardhat";
import { ReputationToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationToken", function () {
  let reputationToken: ReputationToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const ReputationTokenFactory = await ethers.getContractFactory(
      "ReputationToken"
    );
    reputationToken = (await ReputationTokenFactory.deploy(
      "SkyLedger Reputation",
      "SLREP"
    )) as unknown as ReputationToken;
    await reputationToken.waitForDeployment(); // Ensure deployment is complete
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      const initialBalance = await reputationToken.balanceOf(addr1.address);

      await reputationToken.mint(addr1.address, mintAmount);

      const finalBalance = await reputationToken.balanceOf(addr1.address);
      expect(finalBalance).to.equal(initialBalance + mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        reputationToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.reverted;
    });

    it("Should increase total supply when minting", async function () {
      const mintAmount = ethers.parseEther("1000");
      const initialSupply = await reputationToken.totalSupply();

      await reputationToken.mint(addr1.address, mintAmount);

      const finalSupply = await reputationToken.totalSupply();
      expect(finalSupply).to.equal(initialSupply + mintAmount);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Give addr1 some tokens to burn
      await reputationToken.mint(addr1.address, ethers.parseEther("1000"));
    });

    it("Should allow owner to burn tokens from an address", async function () {
      const burnAmount = ethers.parseEther("500");
      const initialBalance = await reputationToken.balanceOf(addr1.address);

      await reputationToken.burn(addr1.address, burnAmount);

      const finalBalance = await reputationToken.balanceOf(addr1.address);
      expect(finalBalance).to.equal(initialBalance - burnAmount);
    });

    it("Should not allow non-owner to burn tokens", async function () {
      const burnAmount = ethers.parseEther("500");

      await expect(
        reputationToken.connect(addr1).burn(addr1.address, burnAmount)
      ).to.be.reverted;
    });

    it("Should decrease total supply when burning", async function () {
      const burnAmount = ethers.parseEther("500");
      const initialSupply = await reputationToken.totalSupply();

      await reputationToken.burn(addr1.address, burnAmount);

      const finalSupply = await reputationToken.totalSupply();
      expect(finalSupply).to.equal(initialSupply - burnAmount);
    });

    it("Should revert when trying to burn more tokens than available", async function () {
      const burnAmount = ethers.parseEther("2000"); // More than addr1 has

      await expect(reputationToken.burn(addr1.address, burnAmount)).to.be
        .reverted;
    });
  });
});
