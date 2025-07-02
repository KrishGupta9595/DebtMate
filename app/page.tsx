"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Users, IndianRupee, Clock, CheckCircle2, Calendar, Trash2, TrendingUp, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { PartialPaymentForm } from "@/components/partial-payment-form"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface PaymentEntry {
  id: string
  amount: number
  date: Date
  notes?: string
}

interface LendingRecord {
  id: string
  borrowerName: string
  amount: number
  reason: string
  lentDate: Date
  status: "pending" | "paid"
  notes?: string
  paidAmount: number
  paymentHistory: PaymentEntry[]
  createdAt: Date
}

interface BorrowerSummary {
  name: string
  totalOwed: number
  totalBorrowed: number
  recordCount: number
  lastBorrowed: Date
}

const STORAGE_KEY = "personal-money-tracker"

export default function PersonalMoneyTracker() {
  const [records, setRecords] = useState<LendingRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false)
  const [selectedBorrower, setSelectedBorrower] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [isPartialPaymentOpen, setIsPartialPaymentOpen] = useState(false)
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<LendingRecord | null>(null)

  // Load data from localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsedRecords = JSON.parse(savedData).map((record: any) => ({
          ...record,
          lentDate: new Date(record.lentDate),
          createdAt: record.createdAt ? new Date(record.createdAt) : new Date(record.lentDate),
          paymentHistory:
            record.paymentHistory?.map((payment: any) => ({
              ...payment,
              date: new Date(payment.date),
            })) || [],
        }))
        setRecords(parsedRecords)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }, [])

  // Save data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (error) {
      console.error("Error saving data:", error)
    }
  }, [records])

  // Calculate statistics
  const totalLent = records.reduce((sum, record) => sum + record.amount, 0)
  const totalPending = records
    .filter((record) => record.status === "pending")
    .reduce((sum, record) => sum + (record.amount - record.paidAmount), 0)
  const totalPaid = records.filter((record) => record.status === "paid").reduce((sum, record) => sum + record.amount, 0)

  // Normalize name function to handle case-insensitive and whitespace issues
  const normalizeName = (name: string) => {
    return name.trim().toLowerCase().replace(/\s+/g, " ")
  }

  // Get borrower summaries with normalized names
  const borrowerSummaries: BorrowerSummary[] = Array.from(
    records
      .reduce((map, record) => {
        const normalizedName = normalizeName(record.borrowerName)
        const displayName = record.borrowerName.trim() // Use original case for display

        const existing = map.get(normalizedName) || {
          name: displayName,
          totalOwed: 0,
          totalBorrowed: 0,
          recordCount: 0,
          lastBorrowed: record.lentDate,
        }

        existing.totalBorrowed += record.amount
        existing.recordCount += 1

        if (record.status === "pending") {
          existing.totalOwed += record.amount - record.paidAmount
        }

        if (record.lentDate > existing.lastBorrowed) {
          existing.lastBorrowed = record.lentDate
        }

        map.set(normalizedName, existing)
        return map
      }, new Map<string, BorrowerSummary>())
      .values(),
  ).sort((a, b) => b.totalOwed - a.totalOwed)

  // Filter records
  const filteredRecords = records.filter(
    (record) =>
      record.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reason.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddRecord = (recordData: Partial<LendingRecord>) => {
    const newRecord: LendingRecord = {
      id: Date.now().toString(),
      borrowerName: recordData.borrowerName?.trim() || "",
      amount: recordData.amount || 0,
      reason: recordData.reason || "",
      lentDate: recordData.lentDate || new Date(),
      status: "pending",
      notes: recordData.notes || "",
      paidAmount: 0,
      paymentHistory: [],
      createdAt: new Date(),
    }
    setRecords([newRecord, ...records])
    setIsAddRecordOpen(false)
    toast({
      title: "Record Added! 💰",
      description: `₹${newRecord.amount} lent to ${newRecord.borrowerName}`,
    })
  }

  const markAsPaid = (recordId: string) => {
    setRecords(records.map((record) => (record.id === recordId ? { ...record, status: "paid" as const } : record)))
    const record = records.find((r) => r.id === recordId)
    if (record) {
      toast({
        title: "Payment Received! 🎉",
        description: `${record.borrowerName} paid back ₹${record.amount}`,
      })
    }
  }

  const deleteRecord = (recordId: string) => {
    setRecords(records.filter((record) => record.id !== recordId))
    toast({
      title: "Record Deleted",
      description: "The lending record has been removed",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (record: LendingRecord) => {
    if (record.status === "paid") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
  }

  const getStatusText = (record: LendingRecord) => {
    if (record.status === "paid") return "Paid"
    return "Pending"
  }

  const handlePartialPayment = (recordId: string, paymentAmount: number, paymentNotes?: string) => {
    setRecords(
      records.map((record) => {
        if (record.id === recordId) {
          const newPaidAmount = record.paidAmount + paymentAmount
          const newPaymentEntry: PaymentEntry = {
            id: Date.now().toString(),
            amount: paymentAmount,
            date: new Date(),
            notes: paymentNotes,
          }

          const updatedRecord = {
            ...record,
            paidAmount: newPaidAmount,
            paymentHistory: [...record.paymentHistory, newPaymentEntry],
            status: newPaidAmount >= record.amount ? ("paid" as const) : ("pending" as const),
          }

          return updatedRecord
        }
        return record
      }),
    )

    const record = records.find((r) => r.id === recordId)
    if (record) {
      const newPaidAmount = record.paidAmount + paymentAmount
      const remainingAmount = record.amount - newPaidAmount

      if (remainingAmount <= 0) {
        toast({
          title: "Fully Paid! 🎉",
          description: `${record.borrowerName} has paid back the full amount`,
        })
      } else {
        toast({
          title: "Partial Payment Received! 💰",
          description: `${record.borrowerName} paid ₹${paymentAmount}. ₹${remainingAmount} remaining`,
        })
      }
    }

    setIsPartialPaymentOpen(false)
    setSelectedRecordForPayment(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-3 sm:p-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Debt Mate</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Keep track of money lent to friends and contacts
          </p>
        </div>

        {/* Quick Add Button */}
        <div className="mb-4 sm:mb-6">
          <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-12 sm:h-10 sm:w-auto bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white text-base sm:text-sm shadow-lg">
                <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Add New Record
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl text-slate-800 dark:text-slate-100">
                  Add Lending Record
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                  Record money lent to a friend or contact
                </DialogDescription>
              </DialogHeader>
              <AddRecordForm onSubmit={handleAddRecord} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 sm:h-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <TabsTrigger
              value="overview"
              className="text-sm sm:text-base data-[state=active]:bg-teal-100 data-[state=active]:text-teal-800 dark:data-[state=active]:bg-teal-900/30 dark:data-[state=active]:text-teal-300"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="text-sm sm:text-base data-[state=active]:bg-teal-100 data-[state=active]:text-teal-800 dark:data-[state=active]:bg-teal-900/30 dark:data-[state=active]:text-teal-300"
            >
              Records
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="text-sm sm:text-base data-[state=active]:bg-teal-100 data-[state=active]:text-teal-800 dark:data-[state=active]:bg-teal-900/30 dark:data-[state=active]:text-teal-300"
            >
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 backdrop-blur-sm border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Lent</p>
                      <p className="text-base sm:text-lg lg:text-2xl font-bold text-blue-800 dark:text-blue-100 truncate">
                        {formatCurrency(totalLent)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-800/50 rounded-full">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 backdrop-blur-sm border-amber-200/50 dark:border-amber-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Pending</p>
                      <p className="text-base sm:text-lg lg:text-2xl font-bold text-amber-800 dark:text-amber-100 truncate">
                        {formatCurrency(totalPending)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-800/50 rounded-full">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        Returned
                      </p>
                      <p className="text-base sm:text-lg lg:text-2xl font-bold text-emerald-800 dark:text-emerald-100 truncate">
                        {formatCurrency(totalPaid)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-800/50 rounded-full">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                        Friends
                      </p>
                      <p className="text-base sm:text-lg lg:text-2xl font-bold text-purple-800 dark:text-purple-100 truncate">
                        {borrowerSummaries.length}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-800/50 rounded-full">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/50 dark:to-blue-900/50 rounded-lg">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {records.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-slate-500 dark:text-slate-400">
                    <div className="p-4 bg-gradient-to-br from-slate-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-full w-fit mx-auto mb-4">
                      <IndianRupee className="w-8 h-8 sm:w-10 sm:h-10 opacity-50" />
                    </div>
                    <p className="text-base sm:text-lg font-medium mb-2">No records yet</p>
                    <p className="text-sm">Add your first lending record to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {records.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-slate-50 via-blue-50 to-teal-50 dark:from-slate-700 dark:via-slate-600 dark:to-slate-600 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-sm sm:text-base truncate text-slate-800 dark:text-slate-100">
                              {record.borrowerName}
                            </p>
                            <Badge className={`${getStatusColor(record)} text-xs flex-shrink-0`}>
                              {getStatusText(record)}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate mb-1">
                            {record.reason}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {record.lentDate.toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100">
                            {formatCurrency(record.amount)}
                          </p>
                          {record.status === "pending" && record.paidAmount > 0 && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">₹{record.paidAmount} paid</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-4 sm:space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by name or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 sm:h-10 text-base sm:text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
              />
            </div>

            {/* Records List */}
            <div className="space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-slate-500 dark:text-slate-400">
                  <p className="text-base sm:text-lg font-medium mb-2">
                    {records.length === 0 ? "No records yet" : "No matching records"}
                  </p>
                  <p className="text-sm">
                    {records.length === 0 ? "Add your first record to get started" : "Try different search terms"}
                  </p>
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <Card
                    key={record.id}
                    className="hover:shadow-lg transition-all duration-200 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-base sm:text-lg truncate text-slate-800 dark:text-slate-100">
                                {record.borrowerName}
                              </h3>
                              <Badge className={`${getStatusColor(record)} text-xs flex-shrink-0`}>
                                {getStatusText(record)}
                              </Badge>
                            </div>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                              {record.reason}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                Lent: {record.lentDate.toLocaleDateString("en-IN")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                Created: {record.createdAt.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                              {formatCurrency(record.amount - record.paidAmount)}
                            </p>
                            {record.paidAmount > 0 && (
                              <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                ₹{record.paidAmount} paid of ₹{record.amount}
                              </p>
                            )}
                          </div>
                        </div>

                        {record.notes && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded text-sm border border-slate-200/50 dark:border-slate-600/50">
                            <strong className="text-slate-700 dark:text-slate-300">Note:</strong>{" "}
                            <span className="text-slate-600 dark:text-slate-400">{record.notes}</span>
                          </div>
                        )}

                        {/* Mobile-optimized action buttons */}
                        <div className="flex gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-600/50">
                          {record.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRecordForPayment(record)
                                  setIsPartialPaymentOpen(true)
                                }}
                                variant="outline"
                                className="flex-1 h-10 text-xs sm:text-sm border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-900/20"
                              >
                                <IndianRupee className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                Add Payment
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => markAsPaid(record.id)}
                                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white h-10 text-xs sm:text-sm"
                              >
                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                Full
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRecord(record.id)}
                            className="h-10 px-3 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4 sm:space-y-6">
            <div className="grid gap-3 sm:gap-4">
              {borrowerSummaries.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-slate-500 dark:text-slate-400">
                  <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-base sm:text-lg font-medium mb-2">No contacts yet</p>
                  <p className="text-sm">Add lending records to see your contacts here</p>
                </div>
              ) : (
                borrowerSummaries.map((borrower) => (
                  <Card
                    key={borrower.name}
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
                    onClick={() => setSelectedBorrower(borrower.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg mb-1 truncate text-slate-800 dark:text-slate-100">
                            {borrower.name}
                          </h3>
                          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <p>{borrower.recordCount} transactions</p>
                            <p>Last: {borrower.lastBorrowed.toLocaleDateString("en-IN")}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(borrower.totalOwed)}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500">
                            {borrower.totalOwed > 0 ? "Outstanding" : "All clear"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Detail Modal */}
        {selectedBorrower && (
          <Dialog open={!!selectedBorrower} onOpenChange={() => setSelectedBorrower(null)}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl truncate text-slate-800 dark:text-slate-100">
                  {selectedBorrower}'s History
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                  All transactions with {selectedBorrower}
                </DialogDescription>
              </DialogHeader>
              <ContactDetailView
                contactName={selectedBorrower}
                records={records.filter((r) => normalizeName(r.borrowerName) === normalizeName(selectedBorrower))}
                onMarkPaid={markAsPaid}
                onDeleteRecord={deleteRecord}
                formatCurrency={formatCurrency}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                onAddPayment={(record) => {
                  setSelectedRecordForPayment(record)
                  setIsPartialPaymentOpen(true)
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Partial Payment Modal */}
        {selectedRecordForPayment && (
          <Dialog open={isPartialPaymentOpen} onOpenChange={setIsPartialPaymentOpen}>
            <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="text-lg text-slate-800 dark:text-slate-100">Record Payment</DialogTitle>
                <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                  Record a payment from {selectedRecordForPayment.borrowerName}
                </DialogDescription>
              </DialogHeader>
              <PartialPaymentForm
                record={selectedRecordForPayment}
                onSubmit={(amount, notes) => handlePartialPayment(selectedRecordForPayment.id, amount, notes)}
                onCancel={() => {
                  setIsPartialPaymentOpen(false)
                  setSelectedRecordForPayment(null)
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// Add Record Form Component
function AddRecordForm({ onSubmit }: { onSubmit: (data: Partial<LendingRecord>) => void }) {
  const [formData, setFormData] = useState<Partial<LendingRecord>>({
    borrowerName: "",
    amount: "",
    reason: "",
    lentDate: new Date(),
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.borrowerName || !formData.amount || !formData.reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    onSubmit(formData)
  }

  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="borrowerName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Contact Name *
        </Label>
        <Input
          id="borrowerName"
          value={formData.borrowerName}
          onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
          placeholder="e.g., Rahul"
          className="h-12 sm:h-10 text-base sm:text-sm mt-1 bg-white/80 dark:bg-slate-700/80 border-slate-200/50 dark:border-slate-600/50"
          required
        />
      </div>

      <div>
        <Label htmlFor="amount" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Amount (₹) *
        </Label>
        <Input
          id="amount"
          type="number"
          value={formData.amount === 0 ? "" : formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value === "" ? "" : Number(e.target.value) })}
          placeholder="e.g., 50"
          className="h-12 sm:h-10 text-base sm:text-sm mt-1 bg-white/80 dark:bg-slate-700/80 border-slate-200/50 dark:border-slate-600/50"
          required
        />
      </div>

      <div>
        <Label htmlFor="reason" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Reason *
        </Label>
        <Input
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="e.g., Lunch money, Coffee, Transport"
          className="h-12 sm:h-10 text-base sm:text-sm mt-1 bg-white/80 dark:bg-slate-700/80 border-slate-200/50 dark:border-slate-600/50"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lentDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Date Lent
          </Label>
          <Input
            id="lentDate"
            type="date"
            value={formData.lentDate?.toISOString().split("T")[0]}
            onChange={(e) => setFormData({ ...formData, lentDate: new Date(e.target.value) })}
            className="h-12 sm:h-10 text-base sm:text-sm mt-1 bg-white/80 dark:bg-slate-700/80 border-slate-200/50 dark:border-slate-600/50"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Record Created</Label>
          <div className="h-12 sm:h-10 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md flex items-center text-sm text-slate-600 dark:text-slate-400 mt-1">
            <Clock className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
            {currentTime}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Notes (Optional)
        </Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional notes..."
          rows={3}
          className="mt-1 resize-none text-base sm:text-sm bg-white/80 dark:bg-slate-700/80 border-slate-200/50 dark:border-slate-600/50"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 sm:h-10 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-base sm:text-sm"
      >
        Add Record
      </Button>
    </form>
  )
}

// Contact Detail View Component
function ContactDetailView({
  contactName,
  records,
  onMarkPaid,
  onDeleteRecord,
  formatCurrency,
  getStatusColor,
  getStatusText,
  onAddPayment,
}: {
  contactName: string
  records: LendingRecord[]
  onMarkPaid: (id: string) => void
  onDeleteRecord: (id: string) => void
  formatCurrency: (amount: number) => string
  getStatusColor: (record: LendingRecord) => string
  getStatusText: (record: LendingRecord) => string
  onAddPayment: (record: LendingRecord) => void
}) {
  const totalOwed = records
    .filter((record) => record.status === "pending")
    .reduce((sum, record) => sum + (record.amount - record.paidAmount), 0)
  const totalBorrowed = records.reduce((sum, record) => sum + record.amount, 0)
  const totalPaid = records.filter((record) => record.status === "paid").reduce((sum, record) => sum + record.amount, 0)

  const pendingRecords = records.filter((record) => record.status === "pending")
  const paidRecords = records.filter((record) => record.status === "paid")

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200/50 dark:border-amber-700/50">
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalOwed)}
          </p>
          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">Outstanding</p>
        </div>
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
          <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalBorrowed)}
          </p>
          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">Total Borrowed</p>
        </div>
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-700/50">
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaid)}
          </p>
          <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">Total Paid</p>
        </div>
      </div>

      {/* Pending Records */}
      {pendingRecords.length > 0 && (
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-amber-600 dark:text-amber-400">
            Outstanding ({pendingRecords.length})
          </h3>
          <div className="space-y-3">
            {pendingRecords
              .sort((a, b) => b.lentDate.getTime() - a.lentDate.getTime())
              .map((record) => (
                <Card
                  key={record.id}
                  className="border-amber-200/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 dark:border-amber-700/50"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate text-slate-800 dark:text-slate-100">
                            {record.reason}
                          </p>
                          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 space-y-1">
                            <p>Lent: {record.lentDate.toLocaleDateString("en-IN")}</p>
                            <p>Created: {record.createdAt.toLocaleTimeString("en-IN")}</p>
                          </div>
                          {record.notes && (
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 mt-1 italic">
                              "{record.notes}"
                            </p>
                          )}

                          {/* Payment Progress */}
                          {record.paidAmount > 0 && (
                            <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-xs sm:text-sm border border-emerald-200/50 dark:border-emerald-700/50">
                              <p className="text-emerald-700 dark:text-emerald-300">
                                ₹{record.paidAmount} paid of ₹{record.amount}
                              </p>
                              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mt-1">
                                <div
                                  className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full"
                                  style={{ width: `${(record.paidAmount / record.amount) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(record.amount - record.paidAmount)}
                          </p>
                          <Badge className={`${getStatusColor(record)} text-xs`}>{getStatusText(record)}</Badge>
                        </div>
                      </div>

                      {/* Payment History */}
                      {record.paymentHistory.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                            Recent Payments:
                          </p>
                          <div className="space-y-1">
                            {record.paymentHistory
                              .sort((a, b) => b.date.getTime() - a.date.getTime())
                              .slice(0, 2)
                              .map((payment) => (
                                <div
                                  key={payment.id}
                                  className="flex justify-between text-xs bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded border border-emerald-200/50 dark:border-emerald-700/50"
                                >
                                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                    {formatCurrency(payment.amount)}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-500">
                                    {payment.date.toLocaleDateString("en-IN")}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Mobile-optimized action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-amber-200/50 dark:border-amber-700/50">
                        <Button
                          size="sm"
                          onClick={() => onAddPayment(record)}
                          variant="outline"
                          className="flex-1 h-10 text-xs sm:text-sm border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-900/20"
                        >
                          <IndianRupee className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Add Payment
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onMarkPaid(record.id)}
                          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white h-10 text-xs sm:text-sm"
                        >
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Full
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteRecord(record.id)}
                          className="h-10 px-3 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Paid Records */}
      {paidRecords.length > 0 && (
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-emerald-600 dark:text-emerald-400">
            Payment History ({paidRecords.length})
          </h3>
          <div className="space-y-3">
            {paidRecords
              .sort((a, b) => b.lentDate.getTime() - a.lentDate.getTime())
              .map((record) => (
                <Card
                  key={record.id}
                  className="border-emerald-200/50 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/10 dark:to-green-900/10 dark:border-emerald-700/50"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate text-slate-800 dark:text-slate-100">
                          {record.reason}
                        </p>
                        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 space-y-1">
                          <p>Lent: {record.lentDate.toLocaleDateString("en-IN")}</p>
                          <p>Created: {record.createdAt.toLocaleTimeString("en-IN")}</p>
                        </div>
                        {record.notes && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 mt-1 italic">
                            "{record.notes}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(record.amount)}
                          </p>
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">
                            Paid
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteRecord(record.id)}
                          className="h-8 w-8 p-0 flex-shrink-0 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {records.length === 0 && (
        <div className="text-center py-6 sm:py-8 text-slate-500 dark:text-slate-400">
          <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
          <p className="text-base">No records found for {contactName}</p>
        </div>
      )}
    </div>
  )
}
