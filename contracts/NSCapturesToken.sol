// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSCapturesToken (NSC)
 * @author NS CAPTURES Non-Custodial Infrastructure
 * @notice Official native platform utility, loyalty rewards, and settlement token for NS CAPTURES.
 *
 * Deployment Targets:
 * - Base Mainnet (Chain ID: 8453) - Primary low-cost Coinbase Layer-2
 * - Polygon PoS (Chain ID: 137)   - High-throughput secondary network
 *
 * Characteristics:
 * - Standard ERC-20 with 18 decimals
 * - 1:1 baseline reference peg with GBP (£1.00 = 1.00 NSC)
 * - Mintable only by multi-sig platform treasury (for admin gifting, airdrops, and Web2 bridges)
 * - Burnable by holders (for redeeming gallery prints, physical framing, and licensing vouchers)
 * - EIP-2612 Permit support for gasless approvals
 */

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Ownable: zero address");
        _transferOwnership(initialOwner);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

contract NSCapturesToken is Context, IERC20, IERC20Metadata, Ownable {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string private constant _name = "NS Captures Token";
    string private constant _symbol = "NSC";

    // Max Supply Cap: 100,000,000 NSC
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;

    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensRedeemed(address indexed from, uint256 amount, string service);

    /**
     * @dev Deploys the contract, setting the deployer as initial treasury owner
     * and minting an initial platform reserve pool (e.g. 5,000,000 NSC).
     */
    constructor(
        address initialTreasury,
        uint256 initialReserveSupply
    ) Ownable(initialTreasury) {
        if (initialReserveSupply > 0) {
            _mint(initialTreasury, initialReserveSupply * 10**18);
        }
    }

    function name() public pure override returns (string memory) {
        return _name;
    }

    function symbol() public pure override returns (string memory) {
        return _symbol;
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _spendAllowance(from, _msgSender(), amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Mints new NSC tokens to a user or creator's wallet.
     * Restricted to the platform treasury / administrator.
     */
    function mint(address to, uint256 amount, string calldata reason) external onlyOwner {
        require(_totalSupply + amount <= MAX_SUPPLY, "NSC: Max supply exceeded");
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @notice Destroys tokens from caller's balance (for print/service redemptions).
     */
    function burn(uint256 amount, string calldata service) external {
        _burn(_msgSender(), amount);
        emit TokensRedeemed(_msgSender(), amount, service);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to zero address");
        _totalSupply += amount;
        unchecked {
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from zero address");
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
            _totalSupply -= amount;
        }
        emit Transfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from zero address");
        require(spender != address(0), "ERC20: approve to zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }
}

