import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero, Zero } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";
import { useEffect, useState } from "react";

import { CUTOFF_STREAM_ID } from "../constants";
import { Stream } from "../types";
import { getStreamWithdrawableAmount } from "../utils/stream";
import useSablierContract from "./useSablierContract";

export default function useWithdrawableAmount(stream: Stream, isWithdrawFromStreamDisabled: boolean): BigNumber {
  const sablierContract: Contract = useSablierContract();
  const [withdrawableAmount, setWithdrawableAmount] = useState<BigNumber>(Zero);

  useEffect(() => {
    const controller: AbortController = new AbortController();

    async function getWithdrawableAmount(): Promise<void> {
      if (isWithdrawFromStreamDisabled) {
        return;
      }

      if (sablierContract.address === AddressZero) {
        return;
      }

      try {
        let newWithdrawableAmount: BigNumber;

        if (BigNumber.from(stream.id).gte(CUTOFF_STREAM_ID)) {
          newWithdrawableAmount = await sablierContract.balanceOf(stream.id, stream.recipient);
        } else {
          // The Payroll.sol contract doesn't have a "balanceOf" method.
          newWithdrawableAmount = getStreamWithdrawableAmount(stream);
        }

        if (!controller.signal.aborted) {
          setWithdrawableAmount(newWithdrawableAmount);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error while getting the withdrawable amount", error);
        }
      }
    }

    void getWithdrawableAmount();

    return () => {
      controller.abort();
    };
  }, [isWithdrawFromStreamDisabled, sablierContract, setWithdrawableAmount, stream]);

  return withdrawableAmount;
}
