import type { DepositGateConfig } from "./editions";
import howToBuyImage from "../../assets/nft-101/how-to-buy.png";
import mintingImage from "../../assets/nft-101/what-is-minting.png";
import stayProtectedImage from "../../assets/nft-101/stay-protected.png";
import createNftImage from "../../assets/nft-101/create-an-nft.png";

// Optional artwork: save it as src/assets/nft-101/what-is-an-nft.(png|jpg|jpeg|webp) and it's
// picked up automatically. Until then the card falls back to the featured edition's image.
const whatIsAnNftImage = Object.values(
  import.meta.glob<string>("../../assets/nft-101/what-is-an-nft.{png,jpg,jpeg,webp}", {
    eager: true,
    import: "default",
  }),
)[0];

export type GuideContext = { deposit: DepositGateConfig };

// Copy that depends on admin settings (e.g. deposit thresholds) is written as a function
type GuideText = string | ((ctx: GuideContext) => string);

export type NftGuideSection = {
  id: string;
  heading: string;
  paragraphs?: GuideText[];
  bullets?: { term?: string; text: GuideText }[];
  closing?: GuideText[];
  note?: GuideText;
};

export type NftGuide = {
  slug: string;
  title: string;
  image?: string;
  // Two tints for the soft animated wash behind the article header, taken from the artwork
  glow: [string, string];
  summary: string;
  sections: NftGuideSection[];
  takeaways: string[];
  faqs: { question: string; answer: GuideText }[];
  cta: { prompt: string; label: string; to: string };
};

export const guideText = (text: GuideText, ctx: GuideContext) =>
  typeof text === "function" ? text(ctx) : text;

export const nftGuideHref = (slug: string) => `/editions/learn/${slug}`;

// Set when leaving a guide opened from the marketplace, so /editions scrolls back to NFT 101
export const NFT_101_RETURN_KEY = "ns_editions_return_to_nft101";
export const NFT_101_SECTION_ID = "nft-101";

const depositAmounts = ({ deposit }: GuideContext) =>
  `${deposit.ethThreshold} ETH, ${deposit.solThreshold} SOL, ${deposit.usdtThreshold} USDT, ${deposit.usdcThreshold} USDC or ${deposit.btcThreshold} BTC`;

export const NFT_GUIDES: NftGuide[] = [
  {
    slug: "what-is-an-nft",
    title: "What is an NFT?",
    glow: ["#1f7fe8", "#2ccbe6"],
    image: whatIsAnNftImage,
    summary:
      "An NFT is a digital record of ownership kept on a blockchain. Here’s what that means for photography, and how NS CAPTURES uses it to prove an edition is genuine.",
    sections: [
      {
        id: "the-short-answer",
        heading: "The short answer",
        paragraphs: [
          "NFT stands for non-fungible token. Fungible things are interchangeable: one pound coin is worth the same as any other. A non-fungible token is the opposite. It’s a unique entry on a blockchain that points to one specific thing and records who owns it, so it can’t be swapped one-for-one with another token.",
          "The token isn’t the photograph itself. Think of it as a tamper-proof ownership record that travels with the work. Anyone can look at a picture online, but only one owner can hold a particular edition.",
        ],
      },
      {
        id: "why-it-matters",
        heading: "Why it matters for photography",
        paragraphs: [
          "Digital images are easy to copy, which has always made it hard to sell them as collectible originals. NFTs solve the scarcity problem: a photographer decides exactly how many editions exist, and each one is numbered and traceable.",
          "Collectors get proof that their edition came from the photographer rather than a copy saved from the web. Photographers get a way to sell limited editions of their digital work and earn a royalty when those editions sell.",
        ],
      },
      {
        id: "how-it-works-here",
        heading: "How NFTs work on NS CAPTURES",
        paragraphs: ["Every edition on the marketplace carries the same set of protections:"],
        bullets: [
          {
            term: "Token ID",
            text: "Each edition has its own identifier, such as NSC-EDN-2026-0014, so it can’t be confused with another work.",
          },
          {
            term: "Master fingerprint",
            text: "A SHA-256 hash of the photographer’s original, uncompressed file is stored with the edition. If the file changed at all, the fingerprint wouldn’t match.",
          },
          {
            term: "Serial number",
            text: "Each copy in a series is numbered, for example #06 / 25. A Genesis 1/1 is the single master token.",
          },
          {
            term: "Certificate of Authenticity",
            text: "Issued the moment you collect, showing the certificate number, your serial, the owner and the master fingerprint.",
          },
          {
            term: "Curated release",
            text: "Our curators review every edition before it’s published.",
          },
        ],
      },
      {
        id: "edition-types",
        heading: "Edition types you’ll see",
        bullets: [
          {
            term: "Genesis 1/1",
            text: "A single token for the master. There will only ever be one owner.",
          },
          {
            term: "Limited series",
            text: "A fixed number of numbered editions, such as 15 or 25 copies.",
          },
          {
            term: "Physical twin",
            text: "The digital edition comes paired with a museum-grade giclée print.",
          },
        ],
        note: "Buying an edition doesn’t automatically give you the copyright to the photograph. Check the edition’s details and our legal terms for what you can do with it.",
      },
      {
        id: "what-you-need",
        heading: "What you need to get started",
        paragraphs: [
          "To collect, you need an NS CAPTURES account and a Web3 vault: the wallet built into your account that holds the crypto you pay with. You don’t need to understand blockchains in depth. The marketplace handles minting and certification for you.",
        ],
      },
    ],
    takeaways: [
      "An NFT is a unique, verifiable ownership record on a blockchain.",
      "The token proves which edition you own. It isn’t the image file itself.",
      "Every NS CAPTURES edition links back to the photographer’s master through its fingerprint.",
      "Your Certificate of Authenticity is issued as soon as you collect.",
    ],
    faqs: [
      {
        question: "Can someone just screenshot my NFT?",
        answer:
          "They can copy the image, but not the ownership. The token, serial number and certificate stay with you, and they’re what make an edition collectible.",
      },
      {
        question: "Do I need my own crypto wallet?",
        answer:
          "No. Your NS CAPTURES account includes a Web3 vault. You can create a wallet there or connect one you already use.",
      },
      {
        question: "Which blockchains are used?",
        answer:
          "Each collection shows its chain on the edition page, and you can filter the marketplace by chain, including Ethereum, Solana and Base.",
      },
    ],
    cta: {
      prompt: "Ready to see what’s available?",
      label: "Browse editions",
      to: "/editions",
    },
  },
  {
    slug: "how-to-buy-an-nft",
    title: "How to buy an NFT",
    glow: ["#f8c846", "#f2922a"],
    image: howToBuyImage,
    summary:
      "A step-by-step guide to collecting your first edition, from setting up your vault to receiving your Certificate of Authenticity.",
    sections: [
      {
        id: "before-you-start",
        heading: "Before you start",
        paragraphs: [
          "You’ll need an NS CAPTURES account. Sign in, or create an account if you’re new.",
          (ctx) =>
            ctx.deposit.enforceDepositGate
              ? `Buying needs a minimum balance in your Web3 vault: at least ${depositAmounts(ctx)}. It’s a check, not a fee, and the funds stay yours.`
              : "There’s currently no minimum vault balance, so you can buy as soon as your account is set up.",
        ],
      },
      {
        id: "set-up-your-vault",
        heading: "1. Set up your Web3 vault",
        paragraphs: [
          "Open your account and go to the Web3 vault. Create a wallet, or connect one you already use.",
          "To add funds, choose a coin, copy its deposit address and send crypto from an exchange or another wallet. Deposits show in your vault once they’re confirmed on-chain.",
        ],
        note: "Always send the coin on the network shown next to the deposit address. Crypto sent on the wrong network can’t be recovered.",
      },
      {
        id: "find-an-edition",
        heading: "2. Find an edition",
        paragraphs: [
          "Browse the marketplace, or narrow it down with the category and chain filters. Trending collections show the work collectors are watching right now.",
          "Open an edition to read its story and check the details: the photographer, edition type, traits, how many copies are left and the camera and lens behind the shot.",
        ],
      },
      {
        id: "check-the-details",
        heading: "3. Check the serial and price",
        bullets: [
          {
            term: "Serial number",
            text: "Each purchase takes the next number in the series. If 5 of 25 copies have sold, you’ll receive #06 / 25.",
          },
          {
            term: "Price",
            text: "Shown in ETH or GBP. Switch currency with the toggle above the grid.",
          },
          { term: "Mint and certification", text: "Included in the price, with no extra charge." },
          {
            term: "Creator royalty",
            text: "The share of the sale that goes to the photographer, shown before you confirm.",
          },
        ],
      },
      {
        id: "confirm-and-pay",
        heading: "4. Confirm and pay",
        paragraphs: [
          "Choose Buy now, pick a settlement currency and review the total. You can pay in ETH, SOL, USDT or GBP.",
          "When you confirm, the next serial is assigned to you and your certificate is issued straight away.",
        ],
      },
      {
        id: "after-you-buy",
        heading: "5. After you buy",
        paragraphs: [
          "Your Certificate of Authenticity shows the certificate number, your serial, the owner and the master fingerprint. You can print it, or copy its verification data to share with anyone who wants to check it.",
        ],
        note: "Buying a Genesis 1/1 makes you the only owner of that token. Once it sells, the edition is marked sold out.",
      },
    ],
    takeaways: [
      "Set up your Web3 vault before you buy.",
      "Check the serial, price and royalty before you confirm.",
      "Pay in ETH, SOL, USDT or GBP.",
      "Your certificate is issued the moment your purchase completes.",
    ],
    faqs: [
      {
        question: "Is there an extra fee for minting?",
        answer: "No. Minting and certification are included in the edition price.",
      },
      {
        question: "What if an edition sells out while I’m buying?",
        answer:
          "The purchase can’t complete once the last copy has gone, and the edition is marked sold out on the marketplace.",
      },
      {
        question: "Which currencies can I pay with?",
        answer: "You can settle in ETH, SOL, USDT or GBP. Pick one before you confirm.",
      },
    ],
    cta: {
      prompt: "Find your first edition.",
      label: "Browse editions",
      to: "/editions",
    },
  },
  {
    slug: "what-is-minting",
    title: "What is minting?",
    glow: ["#4fd07f", "#1f9d6a"],
    image: mintingImage,
    summary:
      "Minting is how a photograph becomes a set of NFT editions. Here’s what happens when an edition is minted, and what gets decided along the way.",
    sections: [
      {
        id: "minting-explained",
        heading: "Minting, explained",
        paragraphs: [
          "To mint is to create a token on a blockchain. When a photographer mints an edition, the marketplace records a new token that stands for their photograph, along with the rules for how many copies exist and who is paid when they sell.",
          "Before minting, a photo is just a file. After minting, it’s a numbered, traceable edition that collectors can own.",
        ],
      },
      {
        id: "what-gets-recorded",
        heading: "What’s recorded at mint",
        bullets: [
          { term: "Token ID", text: "The identifier for the edition." },
          {
            term: "Master fingerprint",
            text: "A SHA-256 hash of the original, uncompressed file.",
          },
          {
            term: "Edition type and size",
            text: "A Genesis 1/1, a limited series with a set number of copies, or a physical twin.",
          },
          {
            term: "Price and royalty",
            text: "What collectors pay, and the photographer’s share of sales.",
          },
          {
            term: "Photo details",
            text: "The camera, lens, ISO and year the photograph was made.",
          },
        ],
      },
      {
        id: "why-the-fingerprint-matters",
        heading: "Why the fingerprint matters",
        paragraphs: [
          "A hash is a short code calculated from every byte of a file. Change the file even slightly and the hash changes completely.",
          "By storing the master’s hash, NS CAPTURES can show that every edition in a series comes from the same original, and that the original hasn’t been altered since it was minted.",
        ],
      },
      {
        id: "token-standards",
        heading: "Token standards",
        paragraphs: [
          "Different edition types use different token standards. A Genesis 1/1 uses ERC-721, the standard for one-of-a-kind tokens. Limited series use ERC-1155, which is designed for multiple numbered copies of the same work.",
          "You’ll find the standard, contract address and chain in the details panel of every edition page.",
        ],
      },
      {
        id: "who-can-mint",
        heading: "Who can mint on NS CAPTURES",
        paragraphs: [
          "Minting is open to verified photographers and contributors, using photos that have already been approved on the platform. Our curators review every new edition before it’s published, so collectors know each release has been checked.",
        ],
        note: "As a collector, you never pay separately for minting. It’s included in the price of every edition, and your certificate is issued when you buy.",
      },
    ],
    takeaways: [
      "Minting turns a photograph into a token-backed edition.",
      "The master fingerprint links every copy back to the original file.",
      "A Genesis 1/1 uses ERC-721. Limited series use ERC-1155.",
      "Collectors don’t pay extra for minting.",
    ],
    faqs: [
      {
        question: "Does minting change the original photograph?",
        answer:
          "No. Minting records the file’s fingerprint and the edition’s rules. The photograph itself isn’t altered.",
      },
      {
        question: "Is minting the same as buying?",
        answer:
          "No. The photographer mints an edition once. Collectors then buy copies from it, and each purchase is assigned the next serial number.",
      },
    ],
    cta: {
      prompt: "Are you a photographer? Mint your own edition.",
      label: "Start creating",
      to: "/account?tab=nfts",
    },
  },
  {
    slug: "stay-protected-in-web3",
    title: "How to stay protected in web3",
    glow: ["#f6bf3e", "#4f86f0"],
    image: stayProtectedImage,
    summary:
      "Crypto transactions can’t be reversed, so a few careful habits go a long way. Here’s how to keep your vault, your funds and your collection safe.",
    sections: [
      {
        id: "guard-your-keys",
        heading: "Guard your recovery phrase and passwords",
        paragraphs: [
          "If you use an external wallet, its recovery phrase (sometimes called a seed phrase) is the master key to everything in it. Anyone who has it can move your assets, and there’s no way to undo that.",
        ],
        bullets: [
          { text: "Never type your recovery phrase into a website, form or chat." },
          { text: "Never share it, even with someone who says they’re from support." },
          { text: "Keep it offline, somewhere only you can reach." },
        ],
        closing: [
          "Use a strong, unique password for your NS CAPTURES account, and review your security settings regularly.",
        ],
      },
      {
        id: "check-addresses",
        heading: "Check every address and network",
        paragraphs: [
          "Before you send funds to your vault, make sure the coin and network match the ones shown next to the deposit address. Sending USDT on the wrong network, for example, can mean losing it for good.",
        ],
        bullets: [
          { text: "Copy and paste addresses instead of typing them." },
          { text: "After pasting, check the first and last few characters." },
          { text: "For large amounts, send a small test transaction first." },
        ],
      },
      {
        id: "fake-sites-and-messages",
        heading: "Watch out for fake sites and messages",
        paragraphs: [
          "Scammers copy real marketplaces and send messages that look official. Common tricks include fake giveaways, “urgent” security warnings and offers to buy your edition for far more than it’s worth.",
        ],
        bullets: [
          { text: "Check you’re on the real NS CAPTURES site before you sign in." },
          { text: "Don’t follow links in unexpected messages. Go to the site directly instead." },
          { text: "Be suspicious of anyone who pushes you to act quickly." },
        ],
      },
      {
        id: "verify-before-you-buy",
        heading: "Verify before you buy",
        paragraphs: [
          "Editions on the NS CAPTURES marketplace are reviewed by our curators before they’re published. Look for the verified badge next to a collection’s name.",
          "If someone offers you an edition outside the marketplace, ask for its certificate. Compare the certificate number, serial and master fingerprint with the edition page before you pay anything.",
        ],
      },
      {
        id: "if-something-goes-wrong",
        heading: "If something goes wrong",
        paragraphs: [
          "If you think your account or wallet has been compromised, change your password straight away, move any remaining funds to a wallet only you control, and contact our team through the contact page.",
        ],
        note: "Blockchain transactions are final once confirmed. Acting quickly is the best way to limit any loss.",
      },
    ],
    takeaways: [
      "Never share your recovery phrase with anyone.",
      "Match the coin and network before every deposit.",
      "Ignore urgent messages and unexpected links.",
      "Check the certificate and verified badge before buying.",
    ],
    faqs: [
      {
        question: "Should I ever share my recovery phrase with support?",
        answer:
          "No. No legitimate support team needs your recovery phrase. Treat any request for it as a scam.",
      },
      {
        question: "Can a crypto transaction be reversed?",
        answer:
          "No. Once a transaction is confirmed on-chain it’s final, which is why checking the address and network first matters so much.",
      },
    ],
    cta: {
      prompt: "Take a minute to check your account security.",
      label: "Security settings",
      to: "/account?tab=security",
    },
  },
  {
    slug: "create-an-nft-on-ns-captures",
    title: "How to create an NFT on NS CAPTURES",
    glow: ["#2f86f5", "#8b5cf6"],
    image: createNftImage,
    summary:
      "Turn your approved photographs into limited editions that collectors can own. This guide walks through every step, from getting verified to going live.",
    sections: [
      {
        id: "who-can-create",
        heading: "Who can create editions",
        paragraphs: [
          "Editions are created by verified photographers and contributors, from photos that have already been approved on NS CAPTURES.",
          "Everything happens in the NFT Editions tab of your account, which includes a checklist that tracks your progress.",
        ],
      },
      {
        id: "get-verified",
        heading: "1. Get verified",
        paragraphs: [
          "NS CAPTURES verifies your photographer profile before you can publish editions. You can check your status in your account’s security settings.",
        ],
      },
      {
        id: "set-up-your-vault",
        heading: "2. Set up your Web3 vault",
        paragraphs: [
          "Create or connect a wallet in your Web3 vault. Sales and royalties settle there, so it’s where your earnings arrive.",
          (ctx) =>
            ctx.deposit.enforceDepositGate
              ? `You’ll also need to hold a minimum balance: at least ${depositAmounts(ctx)}. It isn’t a fee, and the funds stay yours.`
              : "There’s currently no minimum vault balance needed to start creating.",
        ],
      },
      {
        id: "create-your-edition",
        heading: "3. Create your edition",
        paragraphs: ["Choose an approved photo and select Create edition. Then decide on:"],
        bullets: [
          {
            term: "Edition type",
            text: "A Genesis 1/1, a limited series, or a physical twin paired with a giclée print.",
          },
          { term: "Number of copies", text: "How many numbered editions will exist." },
          { term: "Price", text: "What collectors pay for each copy." },
          { term: "Royalty", text: "The percentage you receive from sales." },
          {
            term: "Photo details",
            text: "The camera, lens and ISO, which help collectors understand the work.",
          },
        ],
        closing: [
          "You can save the edition as a draft and come back to it, or submit it for review straight away.",
        ],
      },
      {
        id: "submit-for-review",
        heading: "4. Submit it for review",
        paragraphs: [
          "Our curators check the file, rights and pricing. If everything’s in order, they approve the edition. If something needs changing, they send it back with a note explaining what to fix.",
          "You can withdraw an edition from review to make changes, then resubmit it when you’re ready. Drafts that have never been published can be deleted.",
        ],
      },
      {
        id: "go-live",
        heading: "5. Go live",
        paragraphs: [
          "Once approved, your edition appears on the marketplace for collectors to buy. Each sale issues a Certificate of Authenticity to the collector, and your earnings settle to your Web3 vault.",
        ],
      },
      {
        id: "tips",
        heading: "Tips for a strong first edition",
        bullets: [
          { text: "Start with a photograph that already resonates with your audience." },
          { text: "Keep early editions small, so each serial feels special." },
          { text: "Write a description that tells the story behind the shot." },
          {
            text: "Price with the edition size in mind. A Genesis 1/1 can carry a higher price than one copy in a series of 25.",
          },
        ],
      },
    ],
    takeaways: [
      "Get verified and set up your Web3 vault first.",
      "Choose the edition type, number of copies, price and royalty.",
      "Curators review every edition before it goes live.",
      "Sales and royalties settle to your vault.",
    ],
    faqs: [
      {
        question: "What happens if my edition is sent back?",
        answer:
          "Read the curator’s note, make the changes and resubmit. The note stays on the edition so you can refer back to it.",
      },
      {
        question: "Can collectors see my drafts?",
        answer:
          "No. Drafts and editions in review are only visible to you and the review team until they’re approved.",
      },
    ],
    cta: {
      prompt: "Turn your best work into an edition.",
      label: "Open NFT Editions",
      to: "/account?tab=nfts",
    },
  },
];

export const getNftGuide = (slug?: string) => NFT_GUIDES.find((guide) => guide.slug === slug);

export function guideReadMinutes(guide: NftGuide, ctx: GuideContext) {
  const text = [
    guide.summary,
    ...guide.sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []).map((p) => guideText(p, ctx)),
      ...(section.bullets ?? []).map((b) => `${b.term ?? ""} ${guideText(b.text, ctx)}`),
      ...(section.closing ?? []).map((p) => guideText(p, ctx)),
      section.note ? guideText(section.note, ctx) : "",
    ]),
    ...guide.takeaways,
    ...guide.faqs.map((faq) => `${faq.question} ${guideText(faq.answer, ctx)}`),
  ].join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
