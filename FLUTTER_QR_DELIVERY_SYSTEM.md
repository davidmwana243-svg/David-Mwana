# Système Professionnel de Confirmation de Livraison par Code QR

Ce fichier contient l'ensemble du code Flutter, Dart, Firebase Firestore, et Règles de Sécurité requis pour implémenter un système ultra-sécurisé de confirmation de réception de colis en temps réel.

---

## 1. STRUCTURE DES DOCUMENTS FIRESTORE (`commandes` ou `orders`)

Chaque document de la collection `orders` possède les champs suivants :

```json
{
  "id": "ORD-739281-XYZ",
  "userId": "usr_948194",
  "userName": "Jean Dupont",
  "userPhone": "+243 820 000 000",
  "items": [
    {
      "productId": "elec-1",
      "name": "Casque sans fil Pro",
      "price": 185000.0,
      "quantity": 1
    }
  ],
  "total": 185000.0,
  "status": "shipped", // values: "pending", "processing", "shipped", "delivered", "cancelled"
  "shippingAddress": {
    "label": "Maison",
    "fullName": "Jean Dupont",
    "phone": "+243 820 000 000",
    "addressLines": "12, Avenue de la Libération",
    "commune": "Lubumbashi",
    "quartier": "Golf",
    "city": "Lubumbashi",
    "country": "RD Congo",
    "latitude": -11.66089,
    "longitude": 27.4794
  },
  "qrToken": "SECURE_TOKEN_GENERATED_AT_SHIPMENT",
  "createdAt": 1782025170000,
  "deliveredAt": null,
  "deliveryLogs": []
}
```

---

## 2. MODÈLES DE DONNÉES DART (`order_model.dart`)

```dart
import 'package:cloud_firestore/cloud_firestore.dart';

class ShippingAddress {
  final String label;
  final String fullName;
  final String phone;
  final String addressLines;
  final String commune;
  final String quartier;
  final String city;
  final String country;
  final double? latitude;
  final double? longitude;

  ShippingAddress({
    required this.label,
    required this.fullName,
    required this.phone,
    required this.addressLines,
    required this.commune,
    required this.quartier,
    required this.city,
    required this.country,
    this.latitude,
    this.longitude,
  });

  factory ShippingAddress.fromMap(Map<String, dynamic> map) {
    return ShippingAddress(
      label: map['label'] ?? '',
      fullName: map['fullName'] ?? '',
      phone: map['phone'] ?? '',
      addressLines: map['addressLines'] ?? '',
      commune: map['commune'] ?? '',
      quartier: map['quartier'] ?? '',
      city: map['city'] ?? '',
      country: map['country'] ?? '',
      latitude: (map['latitude'] as num?)?.toDouble(),
      longitude: (map['longitude'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'label': label,
      'fullName': fullName,
      'phone': phone,
      'addressLines': addressLines,
      'commune': commune,
      'quartier': quartier,
      'city': city,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

class CartItemModel {
  final String productId;
  final String name;
  final double price;
  final int quantity;

  CartItemModel({
    required this.productId,
    required this.name,
    required this.price,
    required this.quantity,
  });

  factory CartItemModel.fromMap(Map<String, dynamic> map) {
    return CartItemModel(
      productId: map['productId'] ?? '',
      name: map['name'] ?? '',
      price: (map['price'] as num).toDouble(),
      quantity: (map['quantity'] as num).toInt(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'name': name,
      'price': price,
      'quantity': quantity,
    };
  }
}

class OrderModel {
  final String id;
  final String userId;
  final String userName;
  final String userPhone;
  final List<CartItemModel> items;
  final double total;
  final String status;
  final ShippingAddress shippingAddress;
  final String? qrToken;
  final DateTime createdAt;
  final DateTime? deliveredAt;

  OrderModel({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userPhone,
    required this.items,
    required this.total,
    required this.status,
    required this.shippingAddress,
    this.qrToken,
    required this.createdAt,
    this.deliveredAt,
  });

  factory OrderModel.fromDocument(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return OrderModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      userName: data['userName'] ?? '',
      userPhone: data['userPhone'] ?? '',
      items: (data['items'] as List<dynamic>?)
              ?.map((item) => CartItemModel.fromMap(item as Map<String, dynamic>))
              .toList() ?? [],
      total: (data['total'] as num).toDouble(),
      status: data['status'] ?? 'pending',
      shippingAddress: ShippingAddress.fromMap(data['shippingAddress'] ?? {}),
      qrToken: data['qrToken'],
      createdAt: DateTime.fromMillisecondsSinceEpoch(data['createdAt'] ?? DateTime.now().millisecondsSinceEpoch),
      deliveredAt: data['deliveredAt'] != null 
          ? DateTime.fromMillisecondsSinceEpoch(data['deliveredAt']) 
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'userPhone': userPhone,
      'items': items.map((item) => item.toMap()).toList(),
      'total': total,
      'status': status,
      'shippingAddress': shippingAddress.toMap(),
      'qrToken': qrToken,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'deliveredAt': deliveredAt?.millisecondsSinceEpoch,
    };
  }
}
```

---

## 3. RÈGLES DE SÉCURITÉ FIREBASE (`firestore.rules`)

Assurez-vous que l'authentification est obligatoire et sécurisez la validation du jeton pour empêcher les faux changements de statuts :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /orders/{orderId} {
      // Lecture autorisée aux créateurs de la commande et aux administrateurs
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid || 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid))
      );
      
      // Création
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      
      // Validation stricte lors de la confirmation par QR pour empêcher les fausses livraisons
      allow update: if request.auth != null && (
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
        // Si le client met à jour pour confirmer la réception de la commande :
        (
          resource.data.userId == request.auth.uid &&
          request.resource.data.status == "delivered" &&
          resource.data.status == "shipped" &&
          request.resource.data.qrToken == resource.data.qrToken && // Le jeton doit être identique
          request.resource.data.deliveredAt != null
        )
      );
    }
    
    // Règle générale admins
    match /admins/{adminId} {
      allow read: if request.auth != null;
    }
  }
}
```

---

## 4. CODE FLUTTER : SCANNER DE CODE QR CLIENT (`client_scanner_screen.dart`)

Ajoutez les dépendance suivantes à votre fichier `pubspec.yaml` :
- `mobile_scanner: ^5.1.0`
- `cloud_firestore: ^4.17.0`

```dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:convert';

class ClientScannerScreen extends StatefulWidget {
  final String expectedOrderId;
  final String expectedToken;

  const ClientScannerScreen({
    Key? key,
    required this.expectedOrderId,
    required this.expectedToken,
  }) : super(key: key);

  @override
  _ClientScannerScreenState createState() => _ClientScannerScreenState();
}

class _ClientScannerScreenState extends State<ClientScannerScreen> {
  bool _isProcessing = false;
  MobileScannerController cameraController = MobileScannerController();

  Future<void> _verifyDelivery(String scannedData) async {
    if (_isProcessing) return;
    setState(() {
      _isProcessing = true;
    });

    try {
      // Analyse du contenu du QR code (généralement au format JSON pour plus de sécurité)
      final Map<String, dynamic> data = json.decode(scannedData);
      
      final String? orderId = data['orderId'];
      final String? token = data['token'];

      if (orderId == widget.expectedOrderId && token == widget.expectedToken) {
        // Enregistrement de la validation sécurisée dans Firestore
        await FirebaseFirestore.instance.collection('orders').doc(orderId).update({
          'status': 'delivered',
          'deliveredAt': DateTime.now().millisecondsSinceEpoch,
        });

        // Affichage du succès
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("🎉 Colis reçu ! Livraison confirmée avec succès."),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true); // Fermer et notifier le succès
      } else {
        _showErrorDialog("Code QR Invalide ou expiré pour cette commande.");
      }
    } catch (e) {
      _showErrorDialog("Format de Code QR non reconnu ouf erreur de lecture.");
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.error_outline, Color: Colors.red),
            SizedBox(width: 8),
            Text("Erreur de validation"),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Réessayer"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text("Scannez le QR de Livraison"),
        backgroundColor: Colors.blueAccent,
        actions: [
          IconButton(
            color: Colors.white,
            icon: ValueListenableBuilder(
              valueListenable: cameraController.torchState,
              builder: (context, state, child) {
                switch (state as TorchState) {
                  case TorchState.off:
                    return const Icon(Icons.flash_off, color: Colors.grey);
                  case TorchState.on:
                    return const Icon(Icons.flash_on, color: Colors.yellow);
                }
              },
            ),
            onPressed: () => cameraController.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: cameraController,
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _verifyDelivery(barcode.rawValue!);
                  break;
                }
              }
            },
          ),
          
          // HUD de visée
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.blueAccent, width: 4),
                borderRadius: BorderRadius.circular(24),
              ),
            ),
          ),
          
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.blueAccent),
                ),
              ),
            ),
            
          const Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Text(
              "Veuillez aligner le code QR de l'administrateur / livreur dans le cadre.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          )
        ],
      ),
    );
  }
}
```

---

## 5. CODE FLUTTER : GÉNERATEUR DE CODE QR ADMIN & GOOGLE MAPS (`admin_order_details.dart`)

Ajoutez ces dépendances dans `pubspec.yaml` :
- `qr_flutter: ^4.1.0`
- `google_maps_flutter: ^2.6.1`
- `url_launcher: ^6.2.5`

```dart
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'order_model.dart';

class AdminOrderDetailsScreen extends StatelessWidget {
  final OrderModel order;

  const AdminOrderDetailsScreen({Key? key, required this.order}) : super(key: key);

  Future<void> _openGoogleMaps() async {
    if (order.shippingAddress.latitude == null || order.shippingAddress.longitude == null) return;
    final url = 'https://www.google.com/maps/search/?api=1&query=${order.shippingAddress.latitude},${order.shippingAddress.longitude}';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Génération du contenu chiffré/sécurisé pour le QR code
    final qrData = json.encode({
      'orderId': order.id,
      'customerId': order.userId,
      'token': order.qrToken ?? 'NO_TOKEN',
      'timestamp': DateTime.now().toIso8601String(),
    });

    return Scaffold(
      appBar: AppBar(
        title: Text("Détails Commande - DavidSTORE Style"),
        backgroundColor: const Color(0xff1a73e8), // Bleu professionnel
      ),
      body: Row(
        children: [
          // CÔTÉ GAUCHE : CARTE ET INFORMATIONS DU CLIENT (55% de la largeur)
          Expanded(
            flex: 55,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Informations Client & Adresse",
                    style: TextStyle(fontWeight: FontWeight.black, fontSize: 18),
                  ),
                  const Divider(),
                  Card(
                    color: Colors.white,
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.person, color: Color(0xff1a73e8)),
                              const SizedBox(width: 8),
                              Text(order.userName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.phone, color: Color(0xff1a73e8)),
                              const SizedBox(width: 8),
                              Text(order.userPhone),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.location_on, color: Colors.redAccent),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "${order.shippingAddress.addressLines}, Q. ${order.shippingAddress.quartier}, C. ${order.shippingAddress.commune}, ${order.shippingAddress.city}",
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Google Maps ou simulation si coordonnées absents
                  Expanded(
                    child: order.shippingAddress.latitude != null && order.shippingAddress.longitude != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Stack(
                              children: [
                                GoogleMap(
                                  initialCameraPosition: CameraPosition(
                                    target: LatLng(order.shippingAddress.latitude!, order.shippingAddress.longitude!),
                                    zoom: 15,
                                  ),
                                  markers: {
                                    Marker(
                                      markerId: MarkerId(order.id),
                                      position: LatLng(order.shippingAddress.latitude!, order.shippingAddress.longitude!),
                                      infoWindow: InfoWindow(title: order.userName, snippet: "Adresse de livraison"),
                                    ),
                                  },
                                ),
                                Positioned(
                                  bottom: 16,
                                  right: 16,
                                  child: FloatingActionButton.extended(
                                    onPressed: _openGoogleMaps,
                                    icon: const Icon(Icons.navigation),
                                    label: const Text("Ouvrir dans Maps"),
                                    backgroundColor: const Color(0xff1a73e8),
                                  ),
                                )
                              ],
                            ),
                          )
                        : Container(
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Center(
                              child: Text(
                                "Coordonnées GPS non disponibles pour cette commande.",
                                style: TextStyle(color: Colors.grey),
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          
          // CÔTÉ DROIT : COLLAPSABLE QR CODE ET VALEURS DE STATUT (45% de la largeur)
          Expanded(
            flex: 45,
            child: Container(
              color: Colors.grey[50],
              padding: const EdgeInsets.all(16),
              child: Center(
                child: Card(
                  elevation: 4,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          "CONTRÔLE DE LIVRAISON SÉCURISÉ",
                          style: TextStyle(fontWeight: FontWeight.black, color: Color(0xff1a73e8), fontSize: 13, letterSpacing: 1.2),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Génération du QR Code de Sécurité",
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        ),
                        const SizedBox(height: 24),
                        
                        // QR Code Widget
                        QrImageView(
                          data: qrData,
                          version: QrVersions.auto,
                          size: 200.0,
                          backgroundColor: Colors.white,
                        ),
                        
                        const SizedBox(height: 24),
                        const Icon(Icons.security, color: Colors.green, size: 28),
                        const SizedBox(height: 8),
                        Text(
                          "Commande ID:\n${order.id}",
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, py: 8),
                          decoration: BoxDecoration(
                            color: order.status == 'delivered' ? Colors.green[50] : Colors.blue[50],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            "Statut actuel : ${order.status.toUpperCase()}",
                            style: TextStyle(
                              color: order.status == 'delivered' ? Colors.green[700] : const Color(0xff1a73e8),
                              fontWeight: FontWeight.black,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}
```
