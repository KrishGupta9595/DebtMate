"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

interface LendingRecord {
  id: string
  borrowerName: string
  amount: number
  reason: string
  lentDate: Date
  dueDate: Date
  status: "pending" | "paid"
  notes?: string
  paidAmount: number
  paymentHistory: PaymentEntry[]
}

interface PaymentEntry {
  id: string
  amount: number
  date: Date
  notes?: string
}

interface PartialPaymentFormProps {
  record: LendingRecord
  onSubmit: (amount: number, notes?: string) => void
  onCancel: () => void
}

export function PartialPaymentForm({ record, onSubmit, onCancel }: PartialPaymentFormProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentNotes, setPaymentNotes] = useState("")

  const remainingAmount = record.amount - record.paidAmount
  const maxPayment = remainingAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const amount = Number(paymentAmount)

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      })
      return
    }

    if (amount > maxPayment) {
      toast({
        title: "Amount Too High",
        description: `Payment cannot exceed remaining amount of ₹${maxPayment}`,
        variant: "destructive",
      })
      return
    }

    onSubmit(amount, paymentNotes || undefined)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Payment Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Original Amount:</span>
          <span className="font-medium">{formatCurrency(record.amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Already Paid:</span>
          <span className="font-medium text-green-600">{formatCurrency(record.paidAmount)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Remaining:</span>
          <span className="text-orange-600">{formatCurrency(remainingAmount)}</span>
        </div>
      </div>

      {/* Payment Amount */}
      <div>
        <Label htmlFor="paymentAmount" className="text-sm font-medium">
          Payment Amount (₹) *
        </Label>
        <Input
          id="paymentAmount"
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder={`Max: ${maxPayment}`}
          max={maxPayment}
          min={1}
          step="1"
          className="h-12 sm:h-10 text-base sm:text-sm mt-1"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Maximum payment: {formatCurrency(maxPayment)}</p>
      </div>

      {/* Quick Amount Buttons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Quick Amounts:</Label>
        <div className="grid grid-cols-2 sm:flex gap-2">
          {[
            Math.min(50, remainingAmount),
            Math.min(100, remainingAmount),
            Math.min(500, remainingAmount),
            remainingAmount,
          ]
            .filter((amount, index, arr) => amount > 0 && arr.indexOf(amount) === index)
            .map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(amount.toString())}
                className="text-xs sm:text-sm h-10 sm:h-8"
              >
                {amount === remainingAmount ? "Full Amount" : `₹${amount}`}
              </Button>
            ))}
        </div>
      </div>

      {/* Payment Notes */}
      <div>
        <Label htmlFor="paymentNotes" className="text-sm font-medium">
          Notes (Optional)
        </Label>
        <Textarea
          id="paymentNotes"
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
          placeholder="Any notes about this payment..."
          rows={3}
          className="mt-1 resize-none text-base sm:text-sm"
        />
      </div>

      {/* Payment History */}
      {record.paymentHistory.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Previous Payments:</Label>
          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
            {record.paymentHistory
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .map((payment) => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded"
                >
                  <div className="flex-1">
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                    <span className="text-gray-500 ml-2 text-xs">{payment.date.toLocaleDateString("en-IN")}</span>
                    {payment.notes && <p className="text-xs text-gray-600 mt-1">"{payment.notes}"</p>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 sm:h-10 text-base sm:text-sm">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 h-12 sm:h-10 bg-blue-600 hover:bg-blue-700 text-base sm:text-sm">
          Record Payment
        </Button>
      </div>
    </form>
  )
}
