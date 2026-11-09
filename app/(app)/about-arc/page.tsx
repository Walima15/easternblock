import { AppHeader } from '@/components/navigation/sidebar-nav';
import { Card, CardContent } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import {
  ARC_FAUCET_URL,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_RPC_URL,
  ARC_USDC_ADDRESS,
} from '@/lib/arc/constants';

export default function AboutArcPage() {
  return (
    <div>
      <AppHeader title="About Arc" />
      <div className="mx-auto max-w-lg space-y-4 p-4 md:max-w-xl md:p-6">
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">What Arc is</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Arc is Circle&apos;s blockchain for digital dollars. USDC on Arc is the money in this part of EasternBlock. You can hold it next to your Bitcoin, then buy it with kwacha, send it to an address, or receive it with a QR code.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This wallet is still a demo. The yellow DEMO MODE banner means no real kwacha, Bitcoin, or USDC moves unless someone deliberately switches the server to Arc testnet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">Fees are paid in USDC</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              On most blockchains you need a separate coin just to pay the network. On Arc, the fee is a tiny amount of USDC. There is no second token to buy before you can send.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The network counts that same USDC very finely when it takes a fee (18 decimal places). The USDC token people send uses 6 decimal places, like cents and fractions of a cent. EasternBlock shows one USDC balance, at 6 decimals. It never adds those two counts together.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">Payments finish in under a second</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Arc is built so a transfer is final in less than a second. You do not wait for a long line of confirmations. Blocks are produced about every half second.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">Try it on testnet</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Arc testnet is play money for builders. Request test USDC from Circle&apos;s faucet, then paste your EasternBlock Arc address. The faucet also offers test euros (EURC). The amount and the wait between requests are shown on the faucet page and can change.
            </p>
            <a
              href={ARC_FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-emerald-600 hover:underline"
            >
              {ARC_FAUCET_URL}
            </a>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kwacha amounts in this app use a fixed demo rate, labelled on the USDC card. It is not today&apos;s exchange rate. A live rate can be plugged in later without changing the screens.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">There is no ARC token airdrop</h2>
            <p className="text-sm leading-relaxed">
              There is no ARC token. Circle has not announced an ARC airdrop. Anyone who tells you to claim, buy, or connect a wallet to receive ARC tokens is running a scam. The money on Arc is USDC.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Never type a recovery phrase into a site that promises free tokens. EasternBlock will not ask for one.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-6 text-sm">
            <h2 className="text-lg font-semibold">Network details</h2>
            <p className="text-muted-foreground">
              Checked against docs.arc.io on 9 Nov 2026. The demo sends on testnet only when ARC_MODE=testnet.
            </p>
            <dl className="space-y-2 pt-2">
              <div>
                <dt className="text-muted-foreground">Testnet chain ID</dt>
                <dd className="font-mono">{ARC_TESTNET_CHAIN_ID}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Testnet RPC</dt>
                <dd className="break-all font-mono text-xs">{ARC_TESTNET_RPC_URL}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">USDC contract (6 decimals)</dt>
                <dd className="break-all font-mono text-xs">{ARC_USDC_ADDRESS}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Explorer</dt>
                <dd>
                  <a
                    href={ARC_TESTNET_EXPLORER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-mono text-xs text-emerald-600 hover:underline"
                  >
                    {ARC_TESTNET_EXPLORER_URL}
                  </a>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <LinkButton href="/dashboard" variant="outline" className="w-full">
          Back to dashboard
        </LinkButton>
      </div>
    </div>
  );
}
