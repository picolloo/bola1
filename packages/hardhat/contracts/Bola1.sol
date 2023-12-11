//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Bola1 is Ownable {
	struct Participant {
		string name;
		address[] votes;
		uint256 numberOfVotes;
	}

	bool public _bola1Ended;
	uint256 public _entranceFee;
	uint256 private _votingBalance;
	mapping(address => uint256) public _balances;
	mapping(address => Participant) public _participants;
	string[] public _participantNames;

	constructor(address _owner) {
		// transferOwnership(_owner);
		transferOwnership(0xa0772bE75c88Cb2eFb987B71e3fa86b4f1146374);
	}

	function setEntranceFee(uint256 fee) public onlyOwner {
		_entranceFee = fee;
	}

	function isOwner(address addr) public view returns (bool) {
		return addr == owner();
	}

	function getParticipants() public view returns (string[] memory) {
		return _participantNames;
	}

	function addParticipant(address addr, string memory name) public onlyOwner {
		require(!_bola1Ended, "Bola1 is ended");
		require(bytes(name).length > 0, "Name is required");
		require(addr != address(0), "Invalid participant address");

		Participant storage newParticipant = _participants[addr];
		newParticipant.name = name;
		_participantNames.push(name);
	}

	function addVote(address addr) public payable {
		require(!_bola1Ended, "Bola1 is ended");
		require(msg.value >= _entranceFee, "Insufficient entrance fee");
		require(addr != address(0), "Invalid participant address");
		require(
			bytes(_participants[addr].name).length != 0,
			"Participant not found"
		);
		require(
			!checkArrayDuplicated(_participants[addr].votes, msg.sender),
			"Duplicated vote"
		);

		_participants[addr].votes.push(msg.sender);
		_participants[addr].numberOfVotes++;
		_votingBalance += msg.value;
	}

	function checkArrayDuplicated(
		address[] memory arr,
		address item
	) internal pure returns (bool) {
		for (uint i = 0; i < arr.length; i++) {
			if (arr[i] == item) {
				return true;
			}
		}
		return false;
	}

	function endOfBola1(address winner) public {
		require(!_bola1Ended, "Bola1 is ended");
		require(
			bytes(_participants[winner].name).length != 0,
			"Participant not found"
		);
		uint256 individualPrize = _votingBalance /
			_participants[winner].numberOfVotes;

		for (uint256 i = 0; i < _participants[winner].numberOfVotes; i++) {
			address recipient = _participants[winner].votes[i];
			_balances[recipient] += individualPrize;
		}

		_bola1Ended = true;
	}

	function transfer(address addr) public {
		require(_balances[addr] > 0, "No fund to be withdrawn");
		(bool success, ) = payable(addr).call{ value: _balances[addr] }("");
		require(success, "Failed to send Ether");
	}

	/**
	 * Function that allows the owner to withdraw all the Ether in the contract
	 * The function can only be called by the owner of the contract as defined by the isOwner modifier
	 */
	function withdraw() public {
		(bool success, ) = payable(owner()).call{
			value: address(this).balance - _votingBalance
		}("");
		require(success, "Failed to send Ether");
	}

	/**
	 * Function that allows the contract to receive ETH
	 */
	receive() external payable {}
}
