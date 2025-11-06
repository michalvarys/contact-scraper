import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/molecules/Dialog';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import Button from '@/components/atoms/Button';
import { useLinkData } from '../hooks/useLinkData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/Card';
import { formatDate } from '../utils/date';

interface LinkDataDialogProps {
    linkId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export const LinkDataDialog: React.FC<LinkDataDialogProps> = ({ linkId, isOpen, onClose }) => {
    const { linkData, isLoading, error, rescrapLink, isRescrapingLink } = useLinkData(linkId);

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent containerClassName='sm:max-w-full md:max-w-[600px] lg:max-w-[800px]' className="max-w-screen max-h-[100vh] mx-auto overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Scrapnutá data</DialogTitle>
                    <DialogDescription>
                        Detailní informace získané z odkazu
                    </DialogDescription>
                </DialogHeader>

                {isLoading && (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 p-4 rounded-md text-red-600">
                        <p className="font-semibold">Chyba při načítání dat</p>
                        <p>{error.message}</p>
                    </div>
                )}

                {!isLoading && !error && linkData && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informace o odkazu</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">ID</p>
                                        <p className="font-mono text-sm">{linkData.link.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Stav</p>
                                        <p>{linkData.link.status}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm font-medium text-gray-500">URL</p>
                                        <a
                                            href={linkData.link.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline break-all"
                                        >
                                            {linkData.link.link}
                                        </a>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Zpracováno</p>
                                        <p>{linkData.link.processedAt ? formatDate(linkData.link.processedAt) : 'Nezpracováno'}</p>
                                    </div>
                                    {linkData.link.errorMessage && (
                                        <div className="col-span-2">
                                            <p className="text-sm font-medium text-gray-500">Chyba</p>
                                            <p className="text-red-600">{linkData.link.errorMessage}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {linkData.company && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informace o firmě</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <p className="text-sm font-medium text-gray-500">Název</p>
                                            <p className="font-semibold text-lg">{linkData.company.name}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm font-medium text-gray-500">Adresa</p>
                                            <p>{linkData.company.address}</p>
                                        </div>
                                        {linkData.company.email && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Email</p>
                                                <a
                                                    href={`mailto:${linkData.company.email}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {linkData.company.email}
                                                </a>
                                            </div>
                                        )}
                                        {linkData.company.phone && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Telefon</p>
                                                <a
                                                    href={`tel:${linkData.company.phone}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {linkData.company.phone}
                                                </a>
                                            </div>
                                        )}

                                        {linkData.company.website && (
                                            <div className="col-span-2">
                                                <p className="text-sm font-medium text-gray-500">Web</p>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={linkData.company.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline break-all"
                                                    >
                                                        {linkData.company.website}
                                                    </a>

                                                    {/* Tlačítko pro získání emailu, pokud web existuje, ale email ne */}
                                                    {!linkData.company?.email && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="ml-2"
                                                            onClick={() => {
                                                                // Funkce zatím prázdná
                                                                console.log('Získat email z webu:', linkData.company!.website);
                                                            }}
                                                        >
                                                            <Mail className="mr-2 h-4 w-4" />
                                                            Získat email
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Počet recenzí</p>
                                            <p>{linkData.company.reviewsCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Scrapnuto</p>
                                            <p>{formatDate(linkData.company.scrapedAt)}</p>
                                        </div>

                                        {linkData.company.categories && linkData.company.categories.length > 0 && (
                                            <div className="col-span-2">
                                                <p className="text-sm font-medium text-gray-500">Kategorie</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {linkData.company.categories.map((category) => (
                                                        <span
                                                            key={category.id}
                                                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                                                        >
                                                            {category.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {linkData.company.metadata && linkData.company.metadata.data && (
                                            <div className="col-span-2">
                                                <p className="text-sm font-medium text-gray-500">Metadata</p>
                                                <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs mt-1">
                                                    {JSON.stringify(JSON.parse(linkData.company.metadata.data), null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {!linkData.company && (
                            <div className="bg-yellow-50 p-4 rounded-md">
                                <div className="flex flex-col gap-4">
                                    <p className="text-yellow-800">
                                        Pro tento odkaz nebyla nalezena žádná scrapnutá data firmy.
                                    </p>
                                    <div className="flex justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={rescrapLink}
                                            disabled={isRescrapingLink}
                                            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
                                        >
                                            {isRescrapingLink ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                            )}
                                            Znovu spustit scrapování
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
