const fs = require('fs');

const path = 'src/app/pages/Admin.tsx';
let code = fs.readFileSync(path, 'utf8');

const targetStr = `            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

const newTabs = `            </div>
          )}
          )}

          {modalTab === "ledger" && (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="bg-white border border-[#ececec] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg text-[#18211f]">Financial Ledger</h3>
                  <div className="text-right">
                    <p className="text-[10px] font-mono tracking-wider text-[#758078] uppercase">Available Balance</p>
                    <p className="font-serif text-xl font-semibold text-[#1e4a3f]">£{user.payoutBalance?.toLocaleString() || "0.00"}</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-end bg-[#f8f9f7] p-4 rounded-xl border border-[#ececec]">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#4a534e] mb-1.5">Adjustment Amount (£)</label>
                    <input type="number" id="ledger-amount" placeholder="e.g. 50 or -50" className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]" />
                  </div>
                  <div className="flex-2">
                    <label className="block text-xs font-semibold text-[#4a534e] mb-1.5">Reason / Note</label>
                    <input type="text" id="ledger-note" placeholder="e.g. Bonus for top performing image" className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]" />
                  </div>
                  <button onClick={() => alert('Balance update requires API integration')} className="bg-[#1e4a3f] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#123b31] transition-colors whitespace-nowrap">
                    Update Balance
                  </button>
                </div>
              </div>

              {isPhotographer && (
                <div className="bg-white border border-[#ececec] rounded-2xl p-6 shadow-sm">
                  <h3 className="font-serif text-lg text-[#18211f] mb-4">Payout Methods</h3>
                  <div className="border border-dashed border-[#ececec] bg-[#f8f9f7] p-6 rounded-xl text-center">
                    <p className="text-xs text-[#6b716d]">No payout methods saved by this user.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {modalTab === "kyc" && (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="bg-white border border-[#ececec] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg text-[#18211f]">Identity Verification</h3>
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">Pending</span>
                </div>
                <div className="border border-dashed border-[#ececec] bg-[#f8f9f7] p-8 rounded-xl text-center">
                  <p className="text-sm font-semibold text-[#18211f]">No documents found</p>
                  <p className="text-xs text-[#6b716d] mt-1">This user has not submitted any KYC documents.</p>
                </div>
              </div>
            </div>
          )}

          {modalTab === "hype" && isPhotographer && (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="bg-white border border-[#ececec] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-serif text-lg text-[#18211f]">The Hype Engine</h3>
                    <p className="text-xs text-[#6b716d]">Manually override public metrics to boost creator visibility.</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-[#18211f] uppercase tracking-wider mb-3 pb-2 border-b border-[#ececec]">Account Overrides</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono tracking-wider text-[#758078] uppercase mb-1.5">Custom Followers Count</label>
                        <input defaultValue={user.customFollowers || ""} type="text" placeholder="e.g. 1.2k" className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#18211f] uppercase tracking-wider mb-3 pb-2 border-b border-[#ececec]">Asset Overrides</p>
                    {userPhotos.length === 0 ? (
                      <p className="text-xs text-[#6b716d]">No photos to override.</p>
                    ) : (
                      <div className="space-y-3">
                        {userPhotos.slice(0, 5).map(photo => (
                          <div key={photo.id} className="flex items-center gap-4 bg-[#f8f9f7] p-3 rounded-xl border border-[#ececec]">
                            <img src={photo.image} className="size-10 object-cover rounded bg-[#ececec]" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold truncate max-w-[150px]">{photo.title}</p>
                            </div>
                            <div className="flex gap-2">
                              <input type="number" placeholder="Views" defaultValue={photo.customViews || ""} className="w-20 text-xs border border-[#ececec] rounded px-2 py-1.5 outline-none" title="Custom Views" />
                              <input type="number" placeholder="Likes" defaultValue={photo.customLikes || ""} className="w-20 text-xs border border-[#ececec] rounded px-2 py-1.5 outline-none" title="Custom Likes" />
                              <input type="number" placeholder="Dls" defaultValue={photo.customDownloads || ""} className="w-16 text-xs border border-[#ececec] rounded px-2 py-1.5 outline-none" title="Custom Downloads" />
                            </div>
                            <button onClick={() => alert('Overrides saved!')} className="text-xs font-semibold text-[#1e4a3f] hover:underline whitespace-nowrap">Save</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

if (!code.includes(targetStr)) {
  console.log("Could not find the target end string");
  process.exit(1);
}

code = code.replace(targetStr, newTabs);

fs.writeFileSync(path, code);
console.log("Tabs successfully added.");
